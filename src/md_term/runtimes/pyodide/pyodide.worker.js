// Web Worker that hosts Pyodide (CPython compiled to WebAssembly) for md-term.
//
// Messages in:   { type: "init", url, packages }
//                { type: "run", code, echo }
// Messages out:  { type: "progress", loaded }      bytes fetched while starting
//                { type: "status", text }          what is being set up
//                { type: "ready", label } | { type: "fatal", error }
//                { type: "print", stream, text }
//                { type: "done", value, error }
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
import json, sys, traceback
from pyodide.code import eval_code_async

__mdterm_globals = {"__name__": "__main__", "__builtins__": __builtins__}

async def __mdterm_run(source, echo):
    try:
        value = await eval_code_async(
            source,
            globals=__mdterm_globals,
            return_mode="last_expr" if echo else "none",
            filename="<stdin>",
        )
    except BaseException as exc:
        tb = exc.__traceback__
        while tb is not None and tb.tb_frame.f_code.co_filename != "<stdin>":
            tb = tb.tb_next  # hide the frames of this harness
        return json.dumps({"error": "".join(traceback.format_exception(type(exc), exc, tb)).rstrip()})
    if echo and value is not None:
        __mdterm_globals["_"] = value
        return json.dumps({"value": repr(value)})
    return json.dumps({})
`;

let pyodide;
let runCode;

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
  const version = pyodide.runPython("import sys; sys.version.split()[0]");
  post({ type: "ready", label: `Pyodide ${pyodide.version} (Python ${version}) running in your browser` });
}

async function run({ code, echo }) {
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
  post({ type: "done", ...JSON.parse(await runCode(code, echo)) });
}

self.onmessage = ({ data }) => {
  const task = data.type === "init" ? init(data) : run(data);
  task.catch((err) => post({ type: data.type === "init" ? "fatal" : "done", error: String(err?.message ?? err) }));
};
