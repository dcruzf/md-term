// Web Worker that hosts Pyodide (CPython compiled to WebAssembly) for md-term.
//
// Messages in:   { type: "init", url, packages }
//                { type: "run", code, echo, filename?, files? }
//                    files: the visitor's scratch files as {name: content};
//                    they are written to the working directory before the
//                    run and read back after it
// Messages out:  { type: "progress", loaded }      bytes fetched while starting
//                { type: "status", text }          what is being set up
//                { type: "ready", label } | { type: "fatal", error }
//                { type: "print", stream, text }
//                { type: "done", value, error, files? }
//
// There is no interrupt message: the page stops running code by terminating
// this worker and starting a fresh one.

const post = (message) => self.postMessage(message);

// Pyodide downloads its own files. Count the bytes as they stream through so
// the page can draw a progress bar without fetching anything twice.
let counting = true;
let loaded = 0;
const nativeFetch = self.fetch.bind(self);
self.fetch = async (...args) => {
  const response = await nativeFetch(...args);
  if (!counting || !response.ok || !response.body) return response;
  const counter = new TransformStream({
    transform(chunk, controller) {
      loaded += chunk.byteLength;
      post({ type: "progress", loaded });
      controller.enqueue(chunk);
    },
  });
  return new Response(response.body.pipeThrough(counter), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

// Runs one piece of code the way the REPL does and reports back as JSON, so no
// Python object ever has to cross into JavaScript.
const HARNESS = `
import importlib, json, linecache, os, sys, traceback
from pyodide.code import eval_code_async

__mdterm_globals = {"__name__": "__main__", "__builtins__": __builtins__}
if os.getcwd() not in sys.path:
    sys.path.insert(0, os.getcwd())

def __mdterm_changed(names):
    # Scripts the visitor edited must be re-imported, not served from cache.
    for name in names:
        if name.endswith(".py"):
            sys.modules.pop(name[:-3], None)
    importlib.invalidate_caches()
    linecache.clearcache()

async def __mdterm_run(source, echo, filename):
    try:
        value = await eval_code_async(
            source,
            globals=__mdterm_globals,
            return_mode="last_expr" if echo else "none",
            filename=filename,
        )
    except BaseException as exc:
        tb = exc.__traceback__
        while tb is not None and tb.tb_frame.f_code.co_filename != filename:
            tb = tb.tb_next  # hide the frames of this harness
        return json.dumps({"error": "".join(traceback.format_exception(type(exc), exc, tb)).rstrip()})
    if echo and value is not None:
        __mdterm_globals["_"] = value
        return json.dumps({"value": repr(value)})
    return json.dumps({})
`;

let pyodide;
let runCode;
let filesChanged;

// The scratch files live in Pyodide's working directory while code runs, so
// open("notes.txt") and `import helper` behave as on a real machine.
const MAX_FILE_BYTES = 256 * 1024;
let onDisk = new Map();

function writeFiles(files) {
  const cwd = pyodide.FS.cwd();
  const changed = [];
  for (const name of onDisk.keys()) {
    if (!(name in files)) pyodide.FS.unlink(`${cwd}/${name}`);
  }
  for (const [name, content] of Object.entries(files)) {
    if (onDisk.get(name) === content) continue;
    pyodide.FS.writeFile(`${cwd}/${name}`, content);
    changed.push(name);
  }
  if (changed.length) filesChanged(changed);
}

function readFiles() {
  const cwd = pyodide.FS.cwd();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const files = {};
  for (const name of pyodide.FS.readdir(cwd)) {
    const stat = name.startsWith(".") ? null : pyodide.FS.stat(`${cwd}/${name}`);
    if (!stat || !pyodide.FS.isFile(stat.mode) || stat.size > MAX_FILE_BYTES) continue;
    try {
      files[name] = decoder.decode(pyodide.FS.readFile(`${cwd}/${name}`));
    } catch {
      // binary: leave it on Pyodide's disk, it cannot be shown in the terminal
    }
  }
  onDisk = new Map(Object.entries(files));
  return files;
}

async function init({ url, packages }) {
  const { loadPyodide } = await import(url + "pyodide.mjs");
  pyodide = await loadPyodide({ indexURL: url });
  counting = false;

  const decoder = new TextDecoder();
  const writer = (stream) => ({
    write(buffer) {
      post({ type: "print", stream, text: decoder.decode(buffer, { stream: true }) });
      return buffer.length;
    },
  });
  pyodide.setStdout(writer("stdout"));
  pyodide.setStderr(writer("stderr"));

  if (packages.length) {
    post({ type: "status", text: `Installing ${packages.join(", ")}…` });
    await pyodide.loadPackage("micropip");
    await pyodide.pyimport("micropip").install(packages);
  }
  pyodide.runPython(HARNESS);
  runCode = pyodide.globals.get("__mdterm_run");
  filesChanged = pyodide.globals.get("__mdterm_changed");
  const version = pyodide.runPython("import sys; sys.version.split()[0]");
  post({ type: "ready", label: `Pyodide ${pyodide.version} (Python ${version}) running in your browser` });
}

async function run({ code, echo, filename = "<stdin>", files }) {
  if (files) writeFiles(files);
  try {
    // `import numpy` just works: packages from the Pyodide distribution are
    // fetched on first use. Anything else needs micropip.
    await pyodide.loadPackagesFromImports(code, {
      messageCallback(text) {
        // Report real downloads only, not "already loaded" on every import.
        if (/^(Loading|Loaded) /.test(text)) post({ type: "print", stream: "stderr", text: text + "\n" });
      },
    });
  } catch {
    // Unparseable code: let the run below report the real error.
  }
  const result = JSON.parse(await runCode(code, echo, filename));
  post({ type: "done", ...result, files: files ? readFiles() : undefined });
}

self.onmessage = ({ data }) => {
  const task = data.type === "init" ? init(data) : run(data);
  task.catch((err) => post({ type: data.type === "init" ? "fatal" : "done", error: String(err?.message ?? err) }));
};
