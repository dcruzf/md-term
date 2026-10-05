// The shell: parses command lines and runs them against the virtual filesystem.
// It never touches the DOM. Commands return plain "blocks" that term.js renders,
// which keeps this module testable under Node.

import { basename, display, join, quote, resolve, tokenize } from "./vfs.js";

const MAX_MATCHES = 200;

const text = (value, cls) => ({ type: "text", text: value, cls });
const error = (value) => ({ type: "error", text: value });

const COMMANDS = {
  help: {
    usage: "help",
    summary: "show this list",
    run() {
      const rows = Object.values(COMMANDS).map(({ usage, summary }) => ({ usage, summary }));
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
      let path = resolve(shell.cwd, args[0]);
      let node = shell.nodes[path];
      if (!node && shell.nodes[path + ".md"]) node = shell.nodes[(path += ".md")];
      if (!node) return fail(name, args[0], "No such file or directory");
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
};

const ALIASES = { open: "cat", search: "grep", ll: "ls", dir: "ls" };

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

export function createShell({ nodes, tags = {}, cwd = "/", loadSearch = async () => [] }) {
  const shell = {
    nodes,
    tags,
    cwd: nodes[cwd]?.type === "dir" ? cwd : "/",
    history: [],
    loadSearch,

    files() {
      return Object.entries(nodes).filter(([, node]) => node.type === "file");
    },

    fileItem(path, label) {
      const node = nodes[path];
      const meta = [node.date, node.title].filter(Boolean).join(" ");
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
      return command.run(shell, args, name);
    },

    // Returns the completed line plus the candidates when the choice is ambiguous.
    complete(line) {
      const tokens = tokenize(line);
      const fresh = line === "" || /\s$/.test(line);
      const word = fresh ? "" : tokens[tokens.length - 1];
      if (!line.endsWith(word)) return { line, candidates: [] }; // quoted word: leave it alone
      const head = line.slice(0, line.length - word.length);

      let candidates;
      if (tokens.length === 0 || (tokens.length === 1 && !fresh)) {
        const names = [...Object.keys(COMMANDS), ...Object.keys(ALIASES)];
        candidates = names.filter((name) => name.startsWith(word)).map((name) => name + " ");
      } else if ((ALIASES[tokens[0]] ?? tokens[0]) === "tag") {
        const lower = word.toLowerCase();
        candidates = Object.keys(tags)
          .filter((name) => name.toLowerCase().startsWith(lower))
          .map((name) => quote(name) + " ");
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
      if (candidates.length === 0) return { line, candidates: [] };
      if (candidates.length === 1) return { line: head + candidates[0], candidates: [] };
      const prefix = commonPrefix(candidates);
      return { line: prefix.length > word.length ? head + prefix : line, candidates };
    },
  };
  return shell;
}

export { COMMANDS };
