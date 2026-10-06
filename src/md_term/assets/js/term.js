// The terminal UI. Every page is complete static HTML; this script turns it
// into a live shell on top of fs.json, fetching other pages on demand.

import { loadPython, needsMoreInput } from "./python.js";
import { createShell } from "./shell.js";
import { display, formatPrompt, quote } from "./vfs.js";

const root = document.documentElement;
const BASE = new URL(root.dataset.base || "./", location.href);
const scrollback = document.getElementById("scrollback");
const form = document.getElementById("prompt");
const input = document.getElementById("input");
const promptLabel = form.querySelector(".ps1");

let shell;
let urlToPath = {};
let historyIndex = 0;
let draft = "";

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

const ps1 = () => formatPrompt(root.dataset.ps1, { ...root.dataset, cwd: shell.cwd });
const siteUrl = (relative) => new URL(relative, BASE).href;

// pushState changes what relative URLs resolve against, so pin them down first.
function absolutize(scope, against) {
  for (const node of scope.querySelectorAll("[href], [src]")) {
    for (const attr of ["href", "src"]) {
      const value = node.getAttribute(attr);
      if (value === null) continue;
      try {
        node.setAttribute(attr, new URL(value, against).href);
      } catch {}
    }
  }
}

function pathForUrl(url) {
  if (url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return null;
  let relative;
  try {
    relative = decodeURIComponent(url.pathname.slice(BASE.pathname.length));
  } catch {
    return null;
  }
  relative = relative.replace(/index\.html$/, "");
  return urlToPath[relative] ?? urlToPath[relative + "/"] ?? null;
}

function link(item) {
  const anchor = el("a", item.kind, item.label);
  const node = item.path ? shell.nodes[item.path] : null;
  anchor.href = siteUrl(item.url ?? node?.url ?? "");
  if (item.path) anchor.dataset.path = item.path;
  if (item.cmd) anchor.dataset.cmd = item.cmd;
  return anchor;
}

const RENDER = {
  text: (block) => el("pre", block.cls ? `plain ${block.cls}` : "plain", block.text),
  error: (block) => el("pre", "plain error", block.text),
  list(block) {
    const list = el("ul", "ls");
    for (const item of block.items) {
      const row = el("li");
      row.append(link(item));
      if (item.meta) row.append(" ", el("span", "meta", item.meta));
      list.append(row);
    }
    return list;
  },
  tree(block) {
    const pre = el("pre", "plain tree");
    for (const row of block.rows) pre.append(el("span", "dim", row.prefix), link(row), "\n");
    return pre;
  },
  matches(block) {
    const list = el("ul", "matches");
    for (const item of block.items) {
      const row = el("li");
      row.append(link({ ...item, kind: "file" }), el("span", "dim", `:${item.line}: `));
      for (const part of item.parts) row.append(part.hit ? el("mark", "", part.text) : part.text);
      list.append(row);
    }
    return list;
  },
  help(block) {
    const table = el("dl", "help");
    for (const row of block.rows) table.append(el("dt", "", row.usage), el("dd", "", row.summary));
    return table;
  },
};

function newEntry(line, prompt = ps1(), cls = "entry") {
  const entry = el("section", cls);
  const cmdline = el("div", "cmdline");
  cmdline.append(el("span", "ps1", prompt), " ", el("span", "cmd", line));
  entry.append(cmdline);
  scrollback.append(entry);
  return entry;
}

async function openFile(path, entry, { push }) {
  const url = siteUrl(shell.nodes[path].url);
  let page;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    page = new DOMParser().parseFromString(await response.text(), "text/html");
  } catch (err) {
    entry.append(RENDER.error({ text: `cat: ${display(path)}: ${err.message}` }));
    return;
  }
  const content = page.getElementById("content");
  if (!content) {
    location.href = url;
    return;
  }
  absolutize(content, url);
  decorate(content);
  content.removeAttribute("id");
  entry.append(document.adoptNode(content));
  document.title = page.title;
  if (push && url !== location.href.split("#")[0]) history.pushState({ path }, "", url);
}

// Output is printed top to bottom, a block at a time, before the prompt returns.
const PRINT_BUDGET_MS = 600;
const PRINT_STEP_MS = 30;

function printable(entry) {
  const lines = [];
  for (const out of entry.querySelectorAll(":scope > :not(.cmdline)")) {
    const prose = out.querySelector(":scope > .prose");
    if (prose) lines.push(...out.querySelectorAll(":scope > :not(.prose)"), ...prose.children);
    else if (out.matches("ul, dl")) lines.push(...out.children);
    else lines.push(out);
  }
  return lines;
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

async function print(lines) {
  const step = Math.min(PRINT_STEP_MS, PRINT_BUDGET_MS / lines.length);
  for (const line of lines) {
    await new Promise((resolve) => setTimeout(resolve, step));
    line.classList.remove("printing");
  }
}

// Short output keeps the prompt in view; a long page is read from its top.
function reveal(entry, anchor) {
  if (anchor) anchor.scrollIntoView({ block: "start" });
  else if (form.getBoundingClientRect().bottom - entry.getBoundingClientRect().top <= innerHeight) {
    form.scrollIntoView({ block: "nearest" });
  } else entry.scrollIntoView({ block: "start" });
}

const finePointer = matchMedia("(pointer: fine)");

// ── Python ───────────────────────────────────────────────────────────
// Enabled per site (data-python holds the runtime's directory). The runtime is
// downloaded the first time it is needed, never on page load.

const pythonBase = root.dataset.python ? siteUrl(root.dataset.python) : null;
let python = null; // promise of the loaded runtime
let running = null; // the runtime while it executes code, for Ctrl+C
let repl = null; // { history, buffer } while the Python REPL owns the prompt

const megabytes = (bytes) => (bytes / 1e6).toFixed(1);

async function getRuntime(entry) {
  if (!python) {
    const line = el("pre", "plain dim", "Loading Python…");
    entry.append(line);
    form.scrollIntoView({ block: "nearest" });
    let shown = -1;
    python = loadPython(pythonBase, (loaded, total) => {
      const percent = Math.floor((100 * loaded) / total);
      if (percent === shown) return;
      shown = percent;
      const filled = Math.floor(percent / 5);
      const bar = "#".repeat(filled) + ".".repeat(20 - filled);
      line.textContent =
        `Downloading Python [${bar}] ${String(percent).padStart(3)}%  ` +
        `${megabytes(loaded)}/${megabytes(total)} MB`;
    }).finally(() => line.remove());
  }
  try {
    return await python;
  } catch (err) {
    python = null; // let the next attempt retry the download
    entry.append(RENDER.error({ text: `python: could not load the runtime: ${err.message}` }));
    return null;
  }
}

async function runPython(code, entry, { echo = false } = {}) {
  const runtime = await getRuntime(entry);
  if (!runtime) return;
  const out = el("pre", "plain");
  entry.append(out);
  running = runtime;
  try {
    const result = await runtime.run(code, {
      echo,
      onPrint(text, stream) {
        out.append(stream === "stderr" ? el("span", "error", text) : text);
        form.scrollIntoView({ block: "nearest" });
      },
    });
    if (result.value != null) out.append(result.value + "\n");
    if (result.error) entry.append(RENDER.error({ text: result.error }));
    if (result.restarted) {
      entry.append(el("pre", "plain dim", "(Python session restarted: variables were lost)"));
    }
  } finally {
    running = null;
    if (!out.textContent) out.remove();
  }
  form.scrollIntoView({ block: "nearest" });
}

async function startRepl(entry) {
  const runtime = await getRuntime(entry);
  if (!runtime) return;
  entry.append(el("pre", "plain dim", `${runtime.label}.\nexit() or Ctrl+D to leave.`));
  repl = { history: [], buffer: [] };
  historyIndex = 0;
  form.scrollIntoView({ block: "nearest" });
}

function leaveRepl() {
  repl = null;
  historyIndex = shell.history.length;
}

const replPrompt = () => (repl.buffer.length ? "..." : ">>>");

// One REPL line: a block is collected until an empty line, then run.
async function replSubmit(line) {
  const entry = newEntry(line, replPrompt(), "entry repl");
  if (line.trim()) repl.history.push(line);
  historyIndex = repl.history.length;
  let code = null;
  let echo = false;
  if (repl.buffer.length) {
    if (line.trim()) repl.buffer.push(line);
    else {
      code = repl.buffer.join("\n");
      repl.buffer = [];
    }
  } else if (/^(exit|quit)(\(\))?$/.test(line.trim())) {
    leaveRepl();
  } else if (needsMoreInput(line)) {
    repl.buffer.push(line);
  } else if (line.trim()) {
    code = line;
    echo = true;
  }
  if (code !== null) await runPython(code, entry, { echo });
  form.scrollIntoView({ block: "nearest" });
}

// Adds a [run] link to Python code blocks.
function decorate(scope) {
  if (!pythonBase) return;
  for (const code of scope.querySelectorAll("pre > code.language-python, pre > code.language-py")) {
    if (code.parentElement.querySelector(".run")) continue;
    const link = el("a", "run", "run");
    link.href = "#run";
    link.dataset.run = "";
    link.title = "Run this block in your browser";
    code.parentElement.append(link);
  }
}

function updatePrompt() {
  promptLabel.textContent = repl ? replPrompt() : ps1();
}

// Hides the prompt while `task` prints, then hands the focus back to it.
async function whileBusy(task) {
  // Commands started from a link leave the focus on that link; hand it back to
  // the prompt. On touch screens only keep it, so a tap never opens the keyboard.
  const keepFocus = document.activeElement === input || finePointer.matches;
  form.classList.add("busy");
  try {
    await task();
  } finally {
    form.classList.remove("busy");
    updatePrompt();
    if (keepFocus) input.focus({ preventScroll: true });
  }
}

function run(line, { push = true, target = null, python: code = null } = {}) {
  return whileBusy(() => execute(line, { push, target, code }));
}

async function execute(line, { push, target, code }) {
  const entry = newEntry(line);
  let result;
  if (code !== null) {
    result = { out: [], python: { code } }; // a [run] link: nothing for the shell to parse
  } else {
    try {
      result = await shell.run(line);
    } catch (err) {
      result = { out: [{ type: "error", text: `${line.trim().split(/\s+/)[0]}: ${err.message}` }] };
    }
    if (!repl) historyIndex = shell.history.length;
    saveHistory();
  }

  root.dataset.cwd = shell.cwd;
  if (result.theme) {
    root.dataset.theme = result.theme;
    try {
      localStorage.setItem("md-term:theme", result.theme);
    } catch {}
  }
  if (result.clear) {
    scrollback.replaceChildren();
    scrollTo(0, 0);
    return;
  }

  for (const block of result.out) entry.append(RENDER[block.type](block));
  if (result.open) await openFile(result.open, entry, { push });
  const lines = reducedMotion.matches ? [] : printable(entry);
  for (const node of lines) node.classList.add("printing"); // hidden but laid out, so the scroll is final
  reveal(entry, target && entry.querySelector(`[id="${CSS.escape(target)}"]`));
  await print(lines);
  if (result.python?.repl) await startRepl(entry);
  else if (result.python) await runPython(result.python.code, entry);
}

async function openPath(path) {
  if (shell.nodes[path]?.type === "dir") {
    await run(`cd ${quote(display(path))}`);
    await run("ls");
  } else {
    await run(`cat ${quote(display(path))}`);
  }
}

function saveHistory() {
  try {
    sessionStorage.setItem("md-term:history", JSON.stringify(shell.history.slice(-200)));
  } catch {}
}

function loadHistory() {
  try {
    return JSON.parse(sessionStorage.getItem("md-term:history")) ?? [];
  } catch {
    return [];
  }
}

function showCandidates(candidates) {
  const entry = newEntry(input.value);
  entry.append(el("pre", "plain dim", candidates.map((c) => c.trim()).join("  ")));
  form.scrollIntoView({ block: "nearest" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (form.classList.contains("busy")) return; // keep what was typed ahead for the next Enter
  const line = input.value;
  input.value = "";
  draft = "";
  if (repl) whileBusy(() => replSubmit(line));
  else run(line);
});

input.addEventListener("keydown", (event) => {
  const lines = repl ? repl.history : shell.history;
  if (event.key === "Tab") {
    event.preventDefault();
    if (repl) {
      input.setRangeText("    ", input.selectionStart, input.selectionEnd, "end"); // indent
      return;
    }
    const { line, candidates } = shell.complete(input.value);
    input.value = line;
    if (candidates.length) showCandidates(candidates);
  } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    if (historyIndex === lines.length) draft = input.value;
    const step = event.key === "ArrowUp" ? -1 : 1;
    historyIndex = Math.max(0, Math.min(lines.length, historyIndex + step));
    input.value = lines[historyIndex] ?? draft;
  } else if (event.ctrlKey && event.key === "l") {
    event.preventDefault();
    if (repl) {
      scrollback.replaceChildren();
      scrollTo(0, 0);
    } else run("clear");
  } else if (event.ctrlKey && event.key === "d" && repl && input.value === "") {
    event.preventDefault();
    newEntry("^D", replPrompt(), "entry repl");
    leaveRepl();
    updatePrompt();
  } else if (event.ctrlKey && event.key === "c" && !running) {
    if (input.selectionStart !== input.selectionEnd) return; // let the browser copy
    event.preventDefault();
    newEntry(input.value + "^C", repl ? replPrompt() : ps1(), repl ? "entry repl" : "entry");
    input.value = "";
    if (repl) repl.buffer = [];
    updatePrompt();
  }
});

// Ctrl+C stops running Python wherever the focus is.
document.addEventListener("keydown", (event) => {
  if (!running || !event.ctrlKey || event.key !== "c" || !getSelection().isCollapsed) return;
  event.preventDefault();
  running.interrupt();
});

// Typing anywhere lands in the prompt, and typing brings the prompt back into view.
document.addEventListener("keydown", (event) => {
  if (event.target === input || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length === 1 && event.key !== " ") input.focus({ preventScroll: true });
});

input.addEventListener("input", () => form.scrollIntoView({ block: "nearest" }));

// Clicking the empty screen focuses the prompt, unless the click selected text.
document.querySelector(".screen").addEventListener("click", (event) => {
  if (event.target.closest("a, input, button, summary")) return;
  if (!finePointer.matches) return; // a tap would summon the keyboard
  if (getSelection().isCollapsed) input.focus({ preventScroll: true });
});

document.addEventListener("click", (event) => {
  const anchor = event.target.closest?.("a[href]");
  if (!anchor || event.defaultPrevented || event.button !== 0) return;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

  if (anchor.dataset.run !== undefined) {
    event.preventDefault();
    if (form.classList.contains("busy")) return;
    const code = anchor.closest("pre").querySelector("code").textContent;
    run("python  # code block", { python: code });
    return;
  }
  if (anchor.dataset.cmd) {
    event.preventDefault();
    run(anchor.dataset.cmd);
    return;
  }
  if (anchor.dataset.path && shell.nodes[anchor.dataset.path]) {
    event.preventDefault();
    openPath(anchor.dataset.path);
    return;
  }

  const url = new URL(anchor.href);
  const target = decodeURIComponent(url.hash.slice(1));
  if (url.pathname === location.pathname && url.origin === location.origin && target) {
    // Same page: scroll without adding a stateless history entry.
    const heading = document.getElementById(target);
    if (heading) {
      event.preventDefault();
      heading.scrollIntoView({ block: "start" });
      history.replaceState(history.state, "", url.hash);
    }
    return;
  }
  const path = pathForUrl(url);
  if (!path) return; // static file, tag page, external link: let the browser handle it
  event.preventDefault();
  if (shell.nodes[path].type === "dir") openPath(path);
  else run(`cat ${quote(display(path))}`, { target });
});

window.addEventListener("popstate", (event) => {
  const path = event.state?.path;
  if (path && shell.nodes[path]) run(`cat ${quote(display(path))}`, { push: false });
  else if (!location.hash) location.reload();
});

async function start() {
  const fs = await (await fetch(siteUrl("fs.json"))).json();
  for (const [path, node] of Object.entries(fs.nodes)) {
    if (node.type === "file" || !(node.url in urlToPath)) urlToPath[node.url] = path;
  }

  let search;
  shell = createShell({
    nodes: fs.nodes,
    tags: fs.tags,
    cwd: root.dataset.cwd,
    themes: (root.dataset.themes ?? "").split(" ").filter(Boolean),
    theme: root.dataset.theme,
    python: Boolean(pythonBase),
    loadSearch: () => (search ??= fetch(siteUrl("search.json")).then((r) => r.json())),
  });
  shell.history = loadHistory();
  historyIndex = shell.history.length;

  absolutize(document.body, location.href);
  decorate(document);
  const current = document.getElementById("content")?.dataset.path;
  history.replaceState({ path: current ?? null }, "");

  root.classList.add("js");
  form.hidden = false;
  if (finePointer.matches) input.focus({ preventScroll: true });
}

start().catch((err) => console.error("md-term: shell unavailable, falling back to plain links", err));
