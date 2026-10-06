// Path helpers for the virtual filesystem described by fs.json.
// Paths are absolute and '/'-separated; the root is shown to the user as '~'.

export function resolve(cwd, arg) {
  if (!arg) return cwd;
  if (arg === "~" || arg.startsWith("~/")) arg = "/" + arg.slice(2);
  const parts = [];
  for (const part of (arg.startsWith("/") ? arg : `${cwd}/${arg}`).split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return "/" + parts.join("/");
}

export function display(path) {
  return path === "/" ? "~" : "~" + path;
}

// Fills a `ps1` template; keep the placeholders in step with config.py.
export function formatPrompt(template, { user, host, cwd }) {
  const values = { user, host, path: display(cwd), dir: cwd === "/" ? "~" : basename(cwd) };
  return template.replace(/\{(\w*)\}/g, (match, name) => values[name] ?? match);
}

export function join(dir, name) {
  return dir === "/" ? "/" + name : `${dir}/${name}`;
}

export function dirname(path) {
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

export function basename(path) {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function quote(arg) {
  if (!/[\s"']/.test(arg)) return arg;
  return arg.includes('"') ? `'${arg}'` : `"${arg}"`;
}

// Splits a command line on whitespace. Quotes group words; everything else is
// literal, so regular expressions such as \d+ reach grep untouched.
export function tokenize(line) {
  const tokens = [];
  let current = null;
  let quoteChar = null;
  for (const ch of line) {
    if (quoteChar) {
      if (ch === quoteChar) quoteChar = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quoteChar = ch;
      current ??= "";
    } else if (/\s/.test(ch)) {
      if (current !== null) tokens.push(current);
      current = null;
    } else {
      current = (current ?? "") + ch;
    }
  }
  if (current !== null) tokens.push(current);
  return tokens;
}
