// In-browser Python. Nothing here is fetched until the visitor first runs
// `python`: then the runtime named in assets/python/manifest.json is downloaded
// (reporting progress), compiled and started in a Web Worker.
//
// A runtime is an object with:
//   label                      text for the REPL banner
//   run(code, { echo, onPrint }) → { value, error, restarted }
//       echo: treat a single line like the REPL does and return its repr
//   interrupt()                stop the running code; the session restarts
//
// To add another runtime, write a loader like `loadMonty` and register it in
// RUNTIMES under the name the build puts in the manifest.

const FEED_SECONDS = 10;
const MEMORY_BYTES = 256 * 1024 * 1024;

class Interrupted extends Error {}

async function fetchModules(base, files, onProgress) {
  const total = Object.values(files).reduce((sum, size) => sum + size, 0);
  let loaded = 0;
  const modules = {};
  await Promise.all(
    Object.keys(files).map(async (name) => {
      const response = await fetch(new URL(name, base));
      if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
      // Count decoded bytes against the sizes in the manifest: Content-Length
      // describes the compressed transfer and would not add up.
      const reader = response.body.getReader();
      const chunks = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        onProgress(Math.min(loaded, total), total);
      }
      modules[name] = await WebAssembly.compile(await new Blob(chunks).arrayBuffer());
    }),
  );
  return modules;
}

// Tracebacks of echoed lines show the wrapper; put the visitor's line back.
function unwrap(traceback, line) {
  const lines = traceback.split("\n");
  const index = lines.findIndex((text) => text.trim() === `_ = (${line})`);
  if (index === -1) return traceback;
  lines[index] = lines[index].replace(`_ = (${line})`, line);
  const marker = lines[index + 1];
  if (marker && /^\s+[~^]+\s*$/.test(marker)) lines[index + 1] = marker.slice("_ = (".length);
  return lines.join("\n");
}

async function loadMonty(base, manifest, onProgress) {
  const modules = await fetchModules(base, manifest.files, onProgress);
  const glue = await import(new URL(manifest.glue, base).href);
  const workerUrl = new URL(manifest.worker, base);

  let handle;
  let session;
  let cancel = null;
  const start = async () => {
    handle = await glue.createPool(modules, workerUrl, { maxProcesses: 1 });
    session = await handle.pool.checkout({
      limits: { maxFeedDurationSecs: FEED_SECONDS, maxMemory: MEMORY_BYTES },
    });
  };
  const restart = async () => {
    handle.kill();
    await start();
  };
  await start();

  const describe = (err) => err.display?.("traceback") ?? String(err.message ?? err);
  const isSyntaxError = (err) => (err.display?.("type-msg") ?? "").startsWith("SyntaxError");

  return {
    label: `Monty ${manifest.version}, a Python subset running in your browser`,

    async run(code, { echo = false, onPrint = () => {} } = {}) {
      const feed = (source) => {
        const interrupted = new Promise((_, reject) => (cancel = () => reject(new Interrupted())));
        const printCallback = (stream, text) => onPrint(text, stream);
        return Promise.race([session.feedRun(source, { printCallback }), interrupted]);
      };
      try {
        if (!echo) {
          await feed(code);
          return { value: null };
        }
        try {
          // Like the REPL: an expression is bound to `_` and its repr shown.
          return { value: await feed(`_ = (${code})\nrepr(_) if _ is not None else None`) };
        } catch (err) {
          if (err instanceof Interrupted || !isSyntaxError(err)) throw err;
          await feed(code); // a statement: nothing ran yet, so run it as written
          return { value: null };
        }
      } catch (err) {
        if (err instanceof Interrupted) return { error: "KeyboardInterrupt", restarted: true };
        const error = unwrap(describe(err), code);
        if (!/^(TimeoutError|MemoryError)\b/m.test(error) && err.display) return { error };
        await restart(); // the worker is in an unknown state after a limit or a crash
        return { error, restarted: true };
      } finally {
        cancel = null;
      }
    },

    async interrupt() {
      if (!cancel) return;
      const reject = cancel;
      await restart();
      reject();
    },
  };
}

const RUNTIMES = { monty: loadMonty };

export async function loadPython(base, onProgress) {
  const response = await fetch(new URL("manifest.json", base));
  if (!response.ok) throw new Error(`manifest.json: HTTP ${response.status}`);
  const manifest = await response.json();
  const load = RUNTIMES[manifest.runtime];
  if (!load) throw new Error(`unknown Python runtime '${manifest.runtime}'`);
  return load(base, manifest, onProgress);
}

// Whether a REPL line opens a block that needs more lines before it can run.
export function needsMoreInput(line) {
  const code = line.replace(/#.*$/, "").trimEnd();
  if (code.endsWith(":") || code.endsWith("\\")) return true;
  let depth = 0;
  for (const ch of code.replace(/(["'])(?:\\.|(?!\1).)*\1/g, "")) {
    if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) depth -= 1;
  }
  return depth > 0;
}
