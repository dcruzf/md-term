// The shell: parses command lines and runs them against the virtual filesystem.
// It never touches the DOM. Commands return plain "blocks" that term.js renders,
// which keeps this module testable under Node.

import { basename, display, join, quote, resolve, tokenize } from "./vfs.js";

const MAX_MATCHES = 200;

// Limits of the visitor's scratch files, which live in their browser's storage.
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024;
const MAX_FILES = 100;
const byteLength = (content) => new TextEncoder().encode(content).length;

const text = (value, cls) => ({ type: "text", text: value, cls });
const error = (value) => ({ type: "error", text: value });

const COMMANDS = {
  help: {
    usage: "help",
    summary: "show this list",
    run(shell) {
      const rows = Object.values(COMMANDS)
        .filter((command) => shell.has(command))
        .map(({ usage, summary }) => ({ usage, summary }));
      return {
        out: [
          { type: "help", rows },
          text("Tab completes, ↑/↓ walk the history, and everything listed is clickable.", "dim"),
        ],
      };
    },
  },

  ls: {
    usage: "ls [path]",
    summary: "list a directory",
    run(shell, args) {
      const path = resolve(shell.cwd, args[0]);
      const node = shell.nodes[path];
      if (!node) return fail("ls", args[0], "No such file or directory");
      if (node.type === "file") return { out: [list([shell.fileItem(path, basename(path))])] };
      const items = node.children.map((name) => {
        const child = join(path, name);
        return shell.nodes[child].type === "dir"
          ? { label: name + "/", path: child, kind: "dir" }
          : shell.fileItem(child, name);
      });
      return { out: [items.length ? list(items) : text("(empty)", "dim")] };
    },
  },

  cd: {
    usage: "cd [dir]",
    summary: "change directory (no argument: go home)",
    run(shell, args) {
      const path = resolve(shell.cwd, args[0] ?? "~");
      const node = shell.nodes[path];
      if (!node) return fail("cd", args[0], "No such file or directory");
      if (node.type !== "dir") return fail("cd", args[0], "Not a directory");
      shell.cwd = path;
      return { out: [] };
    },
  },

  pwd: {
    usage: "pwd",
    summary: "print the current directory",
    run: (shell) => ({ out: [text(display(shell.cwd))] }),
  },

  tree: {
    usage: "tree [dir]",
    summary: "show a directory as a tree",
    run(shell, args) {
      const root = resolve(shell.cwd, args[0]);
      const node = shell.nodes[root];
      if (!node) return fail("tree", args[0], "No such file or directory");
      if (node.type !== "dir") return fail("tree", args[0], "Not a directory");
      const rows = [{ prefix: "", label: display(root), path: root, kind: "dir" }];
      const walk = (dir, indent) => {
        const names = shell.nodes[dir].children;
        names.forEach((name, index) => {
          const last = index === names.length - 1;
          const child = join(dir, name);
          const isDir = shell.nodes[child].type === "dir";
          rows.push({
            prefix: indent + (last ? "└── " : "├── "),
            label: isDir ? name + "/" : name,
            path: child,
            kind: isDir ? "dir" : "file",
          });
          if (isDir) walk(child, indent + (last ? "    " : "│   "));
        });
      };
      walk(root, "");
      return { out: [{ type: "tree", rows }] };
    },
  },

  cat: {
    usage: "cat <file>",
    summary: "read a page (alias: open)",
    run(shell, args, name = "cat") {
      if (!args.length) return { out: [error(`usage: ${name} <file>`)] };
      let path = shell.locate(args[0]);
      let node = shell.nodes[path];
      if (!node && shell.nodes[path + ".md"]) node = shell.nodes[(path += ".md")];
      if (!node) return fail(name, args[0], "No such file or directory");
      if (node.local) {
        const content = shell.readFile(path);
        return { out: content ? [text(content.replace(/\n$/, ""))] : [] };
      }
      if (node.type === "dir") {
        path = join(path, "index.md");
        if (!shell.nodes[path]) return fail(name, args[0], "Is a directory");
      }
      return { out: [], open: path };
    },
  },

  grep: {
    usage: "grep [-i] <pattern> [path]",
    summary: "search every page (regex; lowercase patterns ignore case)",
    async run(shell, args) {
      const flags = args.filter((arg) => /^-[a-z]+$/i.test(arg));
      const [pattern, where] = args.filter((arg) => !flags.includes(arg));
      if (!pattern) return { out: [error("usage: grep [-i] <pattern> [path]")] };
      const ignoreCase = flags.some((flag) => flag.includes("i")) || pattern === pattern.toLowerCase();
      const scope = resolve(shell.cwd, where);
      if (!shell.nodes[scope]) return fail("grep", where, "No such file or directory");

      let regex;
      try {
        regex = new RegExp(pattern, ignoreCase ? "gi" : "g");
      } catch {
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), ignoreCase ? "gi" : "g");
      }

      const docs = await shell.loadSearch();
      const items = [];
      let total = 0;
      for (const doc of docs) {
        if (doc.path !== scope && !doc.path.startsWith(scope === "/" ? "/" : scope + "/")) continue;
        doc.text.split("\n").forEach((line, index) => {
          const parts = splitMatches(line, regex);
          if (!parts) return;
          total += 1;
          if (items.length < MAX_MATCHES) {
            items.push({ path: doc.path, label: display(doc.path), line: doc.line + index, parts });
          }
        });
      }
      if (!total) return { out: [text("no matches", "dim")] };
      const out = [{ type: "matches", items }];
      if (total > items.length) out.push(text(`… ${total - items.length} more matches not shown`, "dim"));
      return { out };
    },
  },

  posts: {
    usage: "posts",
    summary: "list dated pages, newest first",
    run(shell) {
      const items = shell
        .files()
        .filter(([, node]) => node.date)
        .sort(([a, x], [b, y]) => y.date.localeCompare(x.date) || a.localeCompare(b))
        .map(([path]) => shell.fileItem(path, display(path)));
      return { out: [items.length ? list(items) : text("no posts yet", "dim")] };
    },
  },

  tags: {
    usage: "tags",
    summary: "list all tags",
    run(shell) {
      const items = Object.entries(shell.tags).map(([name, tag]) => ({
        label: "#" + name,
        kind: "tag",
        url: tag.url,
        cmd: `tag ${quote(name)}`,
        meta: `(${tag.count})`,
      }));
      return { out: [items.length ? list(items) : text("no tags yet", "dim")] };
    },
  },

  tag: {
    usage: "tag <name>",
    summary: "list the pages carrying a tag",
    run(shell, args) {
      if (!args.length) return { out: [error("usage: tag <name>")] };
      const wanted = args.join(" ").replace(/^#/, "").toLowerCase();
      const items = shell
        .files()
        .filter(([, node]) => (node.tags ?? []).some((tag) => tag.toLowerCase() === wanted))
        .sort(([a, x], [b, y]) => (y.date ?? "").localeCompare(x.date ?? "") || a.localeCompare(b))
        .map(([path]) => shell.fileItem(path, display(path)));
      return { out: [items.length ? list(items) : error(`tag: ${args.join(" ")}: no such tag`)] };
    },
  },

  python: {
    usage: "python [file | -c code]",
    summary: "start a Python REPL, or run a script or one line of code",
    needs: "python",
    run(shell, args) {
      if (args[0] === "-c" && args.length > 1) {
        return { out: [], python: { code: args.slice(1).join(" ") } };
      }
      if (!args.length) return { out: [], python: { repl: true } };
      if (args.length > 1 || args[0].startsWith("-")) {
        return { out: [error("usage: python [file | -c code]")] };
      }
      const path = shell.locate(args[0]);
      const node = shell.nodes[path];
      if (!node) return fail("python", args[0], "No such file or directory");
      if (!node.local) return fail("python", args[0], "not a script (pages cannot be run)");
      return { out: [], python: { code: shell.readFile(path), filename: basename(path) } };
    },
  },

  edit: {
    usage: "edit <file>",
    summary: "write a file in your scratch folder (aliases: nano, vi, vim)",
    needs: "scratch",
    run(shell, args, name = "edit") {
      if (args.length !== 1) return { out: [error(`usage: ${name} <file>`)] };
      const path = shell.locate(args[0]);
      const node = shell.nodes[path];
      if (node?.type === "dir") return fail(name, args[0], "Is a directory");
      if (node && !node.local) {
        const hint = `cp ${args[0]} ${display(shell.scratch)}/`;
        return fail(name, args[0], `Read-only file (copy it first: ${hint})`);
      }
      const problem = shell.checkWritable(path);
      if (problem) return fail(name, args[0], problem);
      return { out: [], edit: path };
    },
  },

  touch: {
    usage: "touch <file>",
    summary: "create an empty scratch file",
    needs: "scratch",
    run(shell, args) {
      if (!args.length) return { out: [error("usage: touch <file>")] };
      for (const arg of args) {
        const path = shell.locate(arg);
        if (shell.nodes[path]?.local) continue;
        const problem = shell.nodes[path] ? "Read-only file system" : shell.writeFile(path, "");
        if (problem) return fail("touch", arg, problem);
      }
      return { out: [] };
    },
  },

  cp: {
    usage: "cp <source> <target>",
    summary: "copy a file, or the text of a page, into your scratch folder",
    needs: "scratch",
    async run(shell, args) {
      if (args.length !== 2) return { out: [error("usage: cp <source> <target>")] };
      let source = shell.locate(args[0]);
      if (!shell.nodes[source] && shell.nodes[source + ".md"]) source += ".md";
      const node = shell.nodes[source];
      if (!node) return fail("cp", args[0], "No such file or directory");
      if (node.type === "dir") return fail("cp", args[0], "Is a directory");
      let content = shell.readFile(source);
      if (content === undefined) {
        content = (await shell.loadSearch()).find((doc) => doc.path === source)?.text ?? "";
      }
      let target = shell.locate(args[1]);
      if (shell.nodes[target]?.type === "dir") target = join(target, basename(source));
      const problem = shell.writeFile(target, content);
      return problem ? fail("cp", args[1], problem) : { out: [] };
    },
  },

  mv: {
    usage: "mv <source> <target>",
    summary: "rename a scratch file",
    needs: "scratch",
    run(shell, args) {
      if (args.length !== 2) return { out: [error("usage: mv <source> <target>")] };
      const source = shell.locate(args[0]);
      if (!shell.nodes[source]) return fail("mv", args[0], "No such file or directory");
      if (!shell.nodes[source].local) return fail("mv", args[0], "Read-only file system");
      let target = shell.locate(args[1]);
      if (shell.nodes[target]?.type === "dir") target = join(target, basename(source));
      if (target === source) return { out: [] };
      const problem = shell.writeFile(target, shell.readFile(source));
      if (problem) return fail("mv", args[1], problem);
      shell.removeFile(source);
      return { out: [] };
    },
  },

  rm: {
    usage: "rm <file>",
    summary: "delete a scratch file",
    needs: "scratch",
    run(shell, args) {
      if (!args.length) return { out: [error("usage: rm <file>")] };
      for (const arg of args) {
        const path = shell.locate(arg);
        if (!shell.nodes[path]) return fail("rm", arg, "No such file or directory");
        if (!shell.nodes[path].local) return fail("rm", arg, "Read-only file system");
        shell.removeFile(path);
      }
      return { out: [] };
    },
  },

  theme: {
    usage: "theme [name]",
    summary: "list the color themes, or switch to one",
    run(shell, args) {
      if (!args.length) {
        const items = shell.themes.map((name) => ({
          label: name,
          kind: name === shell.theme ? "theme current" : "theme",
          cmd: `theme ${name}`,
          meta: name === shell.theme ? "(current)" : "",
        }));
        return { out: [list(items)] };
      }
      if (!shell.themes.includes(args[0])) return fail("theme", args[0], "no such theme");
      shell.theme = args[0];
      return { out: [text(`theme set to ${args[0]}`, "dim")], theme: args[0] };
    },
  },

  history: {
    usage: "history",
    summary: "show the commands typed so far",
    run: (shell) => ({
      out: [text(shell.history.map((line, i) => `${String(i + 1).padStart(4)}  ${line}`).join("\n"))],
    }),
  },

  clear: {
    usage: "clear",
    summary: "clear the screen",
    run: () => ({ out: [], clear: true }),
  },

  exit: {
    usage: "exit",
    summary: "start over: back to the home page with a fresh session",
    run: () => ({ out: [], exit: true }),
  },
};

const ALIASES = {
  open: "cat",
  search: "grep",
  ll: "ls",
  dir: "ls",
  nano: "edit",
  vi: "edit",
  vim: "edit",
  logout: "exit",
};

function list(items) {
  return { type: "list", items };
}

function fail(command, arg, message) {
  return { out: [error(`${command}: ${arg}: ${message}`)] };
}

// Splits `line` into {text, hit} parts around the regex matches; null if none.
function splitMatches(line, regex) {
  regex.lastIndex = 0;
  const parts = [];
  let last = 0;
  let match;
  while ((match = regex.exec(line))) {
    if (match[0] === "") {
      regex.lastIndex += 1;
      continue;
    }
    if (match.index > last) parts.push({ text: line.slice(last, match.index), hit: false });
    parts.push({ text: match[0], hit: true });
    last = match.index + match[0].length;
  }
  if (!parts.length) return null;
  if (last < line.length) parts.push({ text: line.slice(last), hit: false });
  return parts;
}

function commonPrefix(words) {
  let prefix = words[0] ?? "";
  for (const word of words) {
    while (!word.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

export function createShell({
  nodes,
  tags = {},
  cwd = "/",
  themes = [],
  theme = themes[0],
  python = false,
  scratch = false,
  storage = null, // { read() → {name: content}, write({name: content}) }; null keeps files in memory
  loadSearch = async () => [],
}) {
  // The scratch folder is the one writable place: a flat folder of the
  // visitor's own files, mounted next to the site's pages.
  const mount = !scratch ? null : nodes["/scratch"] ? "/.scratch" : "/scratch";
  const local = new Map();
  if (mount) {
    // Listed with the other folders, which come before the files.
    const children = [...nodes["/"].children];
    const firstFile = children.findIndex((name) => nodes[join("/", name)].type === "file");
    children.splice(firstFile === -1 ? children.length : firstFile, 0, basename(mount));
    nodes = { ...nodes, "/": { ...nodes["/"], children } };
    nodes[mount] = { type: "dir", url: null, local: true, children: [] };
  }
  const refresh = () => {
    for (const path of Object.keys(nodes)) if (nodes[path].local && path !== mount) delete nodes[path];
    for (const [name, content] of local) {
      nodes[join(mount, name)] = { type: "file", url: null, local: true, size: byteLength(content) };
    }
    nodes[mount].children = [...local.keys()].sort();
  };
  const persist = () => storage?.write(Object.fromEntries(local));
  const nameOf = (path) =>
    mount && path.startsWith(mount + "/") && !path.slice(mount.length + 1).includes("/")
      ? path.slice(mount.length + 1)
      : null;
  if (mount) {
    for (const [name, content] of Object.entries(storage?.read() ?? {})) {
      if (typeof content === "string") local.set(name, content);
    }
    refresh();
  }

  const shell = {
    nodes,
    tags,
    themes,
    theme,
    python,
    scratch: mount,

    has: (command) => !command.needs || Boolean(shell[command.needs]),

    // Like resolve(), but a bare name that is not here falls back to the
    // scratch folder, so `edit notes.py` works from anywhere.
    locate(arg) {
      const path = resolve(shell.cwd, arg);
      if (nodes[path] || !mount || arg.includes("/")) return path;
      if (nodes[path + ".md"]) return path;
      return join(mount, arg);
    },

    readFile: (path) => local.get(nameOf(path) ?? ""),

    // Why `path` cannot be written, or null if it can.
    checkWritable(path, content = "") {
      const name = nameOf(path);
      if (!name) return `Read-only file system (files live in ${display(mount ?? "/")})`;
      const size = byteLength(content);
      if (size > MAX_FILE_BYTES) return "File too large";
      let total = size;
      for (const [other, text] of local) if (other !== name) total += byteLength(text);
      if (total > MAX_TOTAL_BYTES || (!local.has(name) && local.size >= MAX_FILES)) {
        return "No space left on device";
      }
      return null;
    },

    // Returns the reason it failed, or null.
    writeFile(path, content) {
      const problem = shell.checkWritable(path, content);
      if (problem) return problem;
      local.set(nameOf(path), content);
      refresh();
      persist();
      return null;
    },

    removeFile(path) {
      local.delete(nameOf(path));
      refresh();
      persist();
    },

    // The scratch files as {name: content}, and back: Python runs with them
    // on disk and may change, create or delete any.
    exportFiles: () => Object.fromEntries(local),
    importFiles(files) {
      local.clear();
      for (const [name, content] of Object.entries(files)) {
        if (!name.includes("/") && !shell.checkWritable(join(mount, name), content)) {
          local.set(name, content);
        }
      }
      refresh();
      persist();
    },
    cwd: nodes[cwd]?.type === "dir" ? cwd : "/",
    history: [],
    loadSearch,

    files() {
      return Object.entries(nodes).filter(([, node]) => node.type === "file");
    },

    fileItem(path, label) {
      const node = nodes[path];
      const meta = node.local
        ? `${node.size} B`
        : [node.date, node.title].filter(Boolean).join(" ");
      return { label, path, kind: "file", meta };
    },

    async run(line) {
      const [name, ...args] = tokenize(line);
      if (!name) return { out: [] };
      shell.history.push(line.trim());
      const command = COMMANDS[ALIASES[name] ?? name];
      if (!command) {
        return { out: [error(`${name}: command not found (try 'help')`)] };
      }
      if (!shell.has(command)) {
        return { out: [error(`${name}: not enabled on this site`)] };
      }
      return command.run(shell, args, name);
    },

    // Returns the completed line plus the candidates when the choice is ambiguous.
    complete(line) {
      const tokens = tokenize(line);
      const fresh = line === "" || /\s$/.test(line);
      const word = fresh ? "" : tokens[tokens.length - 1];
      const head = line.slice(0, line.length - word.length);
      if (!line.endsWith(word)) return { line, head, candidates: [] }; // quoted word: leave it alone

      let candidates;
      if (tokens.length === 0 || (tokens.length === 1 && !fresh)) {
        const names = [...Object.keys(COMMANDS), ...Object.keys(ALIASES)];
        candidates = names
          .filter((name) => name.startsWith(word) && shell.has(COMMANDS[ALIASES[name] ?? name]))
          .map((name) => name + " ");
      } else if ((ALIASES[tokens[0]] ?? tokens[0]) === "tag") {
        const lower = word.toLowerCase();
        candidates = Object.keys(tags)
          .filter((name) => name.toLowerCase().startsWith(lower))
          .map((name) => quote(name) + " ");
      } else if (tokens[0] === "theme") {
        candidates = themes.filter((name) => name.startsWith(word)).map((name) => name + " ");
      } else {
        const slash = word.lastIndexOf("/");
        const dirPart = word.slice(0, slash + 1);
        const dir = nodes[resolve(shell.cwd, dirPart)];
        const dirsOnly = ["cd", "tree"].includes(tokens[0]);
        candidates = (dir?.type === "dir" ? dir.children : [])
          .filter((name) => name.startsWith(word.slice(slash + 1)))
          .map((name) => {
            const isDir = nodes[join(resolve(shell.cwd, dirPart), name)].type === "dir";
            return { name, isDir };
          })
          .filter(({ isDir }) => isDir || !dirsOnly)
          .map(({ name, isDir }) => quote(dirPart + name) + (isDir ? "/" : " "));
      }

      candidates.sort();
      if (candidates.length === 0) return { line, head, candidates: [] };
      if (candidates.length === 1) return { line: head + candidates[0], head, candidates: [] };
      const prefix = commonPrefix(candidates);
      return { line: prefix.length > word.length ? head + prefix : line, head, candidates };
    },
  };
  return shell;
}

export { COMMANDS };
