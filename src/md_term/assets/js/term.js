// The terminal UI. Every page is complete static HTML; this script turns it
// into a live shell on top of fs.json, fetching other pages on demand.

import { createShell } from "./shell.js";
import { display, quote } from "./vfs.js";

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

const ps1 = () => `${root.dataset.user}@${root.dataset.host}:${display(shell.cwd)}$`;
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

function newEntry(line) {
  const entry = el("section", "entry");
  const cmdline = el("div", "cmdline");
  cmdline.append(el("span", "ps1", ps1()), " ", el("span", "cmd", line));
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
  content.removeAttribute("id");
  entry.append(document.adoptNode(content));
  document.title = page.title;
  if (push && url !== location.href.split("#")[0]) history.pushState({ path }, "", url);
}

async function run(line, { push = true, target = null } = {}) {
  const entry = newEntry(line);
  let result;
  try {
    result = await shell.run(line);
  } catch (err) {
    result = { out: [{ type: "error", text: `${line.trim().split(/\s+/)[0]}: ${err.message}` }] };
  }
  historyIndex = shell.history.length;
  saveHistory();

  if (result.clear) {
    scrollback.replaceChildren();
  } else {
    for (const block of result.out) entry.append(RENDER[block.type](block));
    if (result.open) await openFile(result.open, entry, { push });
  }
  promptLabel.textContent = ps1();
  root.dataset.cwd = shell.cwd;

  const anchor = target && entry.querySelector(`[id="${CSS.escape(target)}"]`);
  (anchor || (result.clear ? form : entry)).scrollIntoView({ block: "start" });
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
  form.scrollIntoView({ block: "end" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const line = input.value;
  input.value = "";
  draft = "";
  run(line);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const { line, candidates } = shell.complete(input.value);
    input.value = line;
    if (candidates.length) showCandidates(candidates);
  } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    if (historyIndex === shell.history.length) draft = input.value;
    const step = event.key === "ArrowUp" ? -1 : 1;
    historyIndex = Math.max(0, Math.min(shell.history.length, historyIndex + step));
    input.value = shell.history[historyIndex] ?? draft;
  } else if (event.ctrlKey && event.key === "l") {
    event.preventDefault();
    run("clear");
  } else if (event.ctrlKey && event.key === "c" && input.selectionStart === input.selectionEnd) {
    event.preventDefault();
    newEntry(input.value + "^C");
    input.value = "";
  }
});

// Typing anywhere lands in the prompt.
document.addEventListener("keydown", (event) => {
  if (event.target === input || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length === 1 && event.key !== " ") input.focus({ preventScroll: true });
});

document.addEventListener("click", (event) => {
  const anchor = event.target.closest?.("a[href]");
  if (!anchor || event.defaultPrevented || event.button !== 0) return;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

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
    loadSearch: () => (search ??= fetch(siteUrl("search.json")).then((r) => r.json())),
  });
  shell.history = loadHistory();
  historyIndex = shell.history.length;

  absolutize(document.body, location.href);
  const current = document.getElementById("content")?.dataset.path;
  history.replaceState({ path: current ?? null }, "");

  root.classList.add("js");
  form.hidden = false;
  if (matchMedia("(pointer: fine)").matches) input.focus({ preventScroll: true });
}

start().catch((err) => console.error("md-term: shell unavailable, falling back to plain links", err));
