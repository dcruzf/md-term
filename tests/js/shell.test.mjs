import assert from "node:assert/strict";
import { test } from "node:test";

import { createShell } from "../../src/md_term/assets/js/shell.js";
import { display, formatPrompt, quote, resolve, tokenize } from "../../src/md_term/assets/js/vfs.js";

const nodes = {
  "/": { type: "dir", url: "", children: ["blog", "guide", "index.md"] },
  "/blog": { type: "dir", url: "blog/", children: ["first.md", "second.md"] },
  "/guide": { type: "dir", url: "guide/", children: ["index.md", "setup.md"] },
  "/index.md": { type: "file", url: "", title: "Home" },
  "/blog/first.md": { type: "file", url: "blog/first/", title: "First", date: "2026-01-02", tags: ["Python"] },
  "/blog/second.md": { type: "file", url: "blog/second/", title: "Second", date: "2026-03-04", tags: ["Python", "my tag"] },
  "/guide/index.md": { type: "file", url: "guide/", title: "Guide" },
  "/guide/setup.md": { type: "file", url: "guide/setup/", title: "Setup" },
};
const tags = { Python: { url: "tags/python/", count: 2 }, "my tag": { url: "tags/my-tag/", count: 1 } };
const docs = [
  { path: "/index.md", line: 1, text: "# Home\nWelcome to the Site" },
  { path: "/blog/first.md", line: 6, text: "intro\nversion 42 of the site" },
];
const make = (cwd = "/") => createShell({ nodes, tags, cwd, loadSearch: async () => docs });
const labels = (result) => result.out[0].items.map((item) => item.label);

test("resolve handles relative, absolute, home and parent paths", () => {
  assert.equal(resolve("/blog", "first.md"), "/blog/first.md");
  assert.equal(resolve("/blog", "../guide/./setup.md"), "/guide/setup.md");
  assert.equal(resolve("/blog", "~"), "/");
  assert.equal(resolve("/blog", "~/guide/"), "/guide");
  assert.equal(resolve("/blog", "/index.md"), "/index.md");
  assert.equal(resolve("/", "../.."), "/");
  assert.equal(resolve("/blog", undefined), "/blog");
  assert.equal(display("/"), "~");
  assert.equal(display("/blog"), "~/blog");
});

test("tokenize groups quoted words and keeps backslashes", () => {
  assert.deepEqual(tokenize('  grep "two words"  \\d+ '), ["grep", "two words", "\\d+"]);
  assert.deepEqual(tokenize("tag 'my tag'"), ["tag", "my tag"]);
  assert.deepEqual(tokenize('echo ""'), ["echo", ""]);
  assert.equal(quote("my tag"), '"my tag"');
  assert.equal(quote("plain"), "plain");
});

test("ls lists directories first-class and reports errors", async () => {
  const shell = make();
  assert.deepEqual(labels(await shell.run("ls")), ["blog/", "guide/", "index.md"]);
  assert.deepEqual(labels(await shell.run("ls blog")), ["first.md", "second.md"]);
  assert.equal((await shell.run("ls nope")).out[0].type, "error");
});

test("cd changes and validates the working directory", async () => {
  const shell = make();
  await shell.run("cd blog");
  assert.equal(shell.cwd, "/blog");
  assert.equal((await shell.run("cd first.md")).out[0].text, "cd: first.md: Not a directory");
  assert.equal(shell.cwd, "/blog");
  await shell.run("cd");
  assert.equal(shell.cwd, "/");
});

test("cat opens files, index pages and extensionless names", async () => {
  const shell = make("/blog");
  assert.equal((await shell.run("cat first.md")).open, "/blog/first.md");
  assert.equal((await shell.run("open ../guide/setup")).open, "/guide/setup.md");
  assert.equal((await shell.run("cat ~/guide")).open, "/guide/index.md");
  assert.match((await shell.run("cat ~/blog")).out[0].text, /Is a directory/);
  assert.match((await shell.run("cat nope")).out[0].text, /No such file/);
});

test("grep is smart-case, scoped and reports source line numbers", async () => {
  const shell = make();
  const all = (await shell.run("grep site")).out[0].items;
  assert.deepEqual(all.map((m) => [m.path, m.line]), [["/index.md", 2], ["/blog/first.md", 7]]);
  assert.deepEqual(all[0].parts, [{ text: "Welcome to the ", hit: false }, { text: "Site", hit: true }]);
  assert.equal((await shell.run("grep Site")).out[0].items.length, 1);
  assert.equal((await shell.run("grep site blog")).out[0].items.length, 1);
  assert.equal((await shell.run("grep \\d+")).out[0].items[0].parts[1].text, "42");
  assert.equal((await shell.run("grep zzz")).out[0].text, "no matches");
  assert.equal((await shell.run("grep (")).out[0].text, "no matches"); // invalid regex → literal
});

test("posts, tags and tag", async () => {
  const shell = make();
  assert.deepEqual(labels(await shell.run("posts")), ["~/blog/second.md", "~/blog/first.md"]);
  assert.deepEqual(labels(await shell.run("tags")), ["#Python", "#my tag"]);
  assert.equal((await shell.run("tags")).out[0].items[1].cmd, 'tag "my tag"');
  assert.deepEqual(labels(await shell.run("tag python")), ["~/blog/second.md", "~/blog/first.md"]);
  assert.deepEqual(labels(await shell.run('tag "my tag"')), ["~/blog/second.md"]);
  assert.equal((await shell.run("tag nope")).out[0].type, "error");
});

test("tree, history, clear and unknown commands", async () => {
  const shell = make();
  const rows = (await shell.run("tree guide")).out[0].rows;
  assert.deepEqual(rows.map((row) => row.prefix + row.label), ["~/guide", "├── index.md", "└── setup.md"]);
  assert.equal((await shell.run("clear")).clear, true);
  assert.match((await shell.run("frobnicate")).out[0].text, /command not found/);
  assert.deepEqual((await shell.run("   ")).out, []);
  assert.deepEqual(shell.history, ["tree guide", "clear", "frobnicate"]);
});

test("tab completion", () => {
  const shell = make();
  assert.equal(shell.complete("he").line, "help ");
  assert.deepEqual(shell.complete("c").candidates, ["cat ", "cd ", "clear "]);
  assert.equal(shell.complete("cat b").line, "cat blog/");
  assert.equal(shell.complete("cat blog/f").line, "cat blog/first.md ");
  assert.deepEqual(shell.complete("cat blog/").candidates, ["blog/first.md ", "blog/second.md "]);
  assert.deepEqual(shell.complete("cd ").candidates, ["blog/", "guide/"]);
  assert.equal(shell.complete("cat guide/s").line, "cat guide/setup.md ");
  assert.equal(shell.complete("tag m").line, 'tag "my tag" ');
  assert.equal(shell.complete("cat zzz").line, "cat zzz");
});

test("theme lists, switches and completes", async () => {
  const shell = createShell({ nodes, themes: ["phosphor", "amber", "paper"], theme: "phosphor" });
  const items = (await shell.run("theme")).out[0].items;
  assert.deepEqual(items.map((item) => [item.label, item.meta]), [["phosphor", "(current)"], ["amber", ""], ["paper", ""]]);
  assert.equal((await shell.run("theme amber")).theme, "amber");
  assert.equal(shell.theme, "amber");
  assert.equal((await shell.run("theme neon")).out[0].text, "theme: neon: no such theme");
  assert.equal(shell.complete("theme a").line, "theme amber ");
  assert.deepEqual(shell.complete("theme p").candidates, ["paper ", "phosphor "]);
});

test("python is only available when the site enables it", async () => {
  const off = make();
  assert.equal((await off.run("python")).out[0].text, "python: not enabled on this site");
  assert.ok(!(await off.run("help")).out[0].rows.some((row) => row.usage.startsWith("python")));
  assert.deepEqual(off.complete("py").candidates, []);

  const on = createShell({ nodes, python: true });
  assert.deepEqual((await on.run("python")).python, { repl: true });
  assert.deepEqual((await on.run('python -c "print(1 + 1)"')).python, { code: "print(1 + 1)" });
  assert.equal((await on.run("python script.py")).out[0].type, "error");
  assert.ok((await on.run("help")).out[0].rows.some((row) => row.usage.startsWith("python")));
  assert.equal(on.complete("py").line, "python ");
});

test("formatPrompt fills the ps1 placeholders", () => {
  const site = { user: "ana", host: "docs" };
  assert.equal(formatPrompt("{user}@{host}:{path}$", { ...site, cwd: "/blog/2026" }), "ana@docs:~/blog/2026$");
  assert.equal(formatPrompt("λ {dir}", { ...site, cwd: "/blog/2026" }), "λ 2026");
  assert.equal(formatPrompt("{dir} {path} >", { ...site, cwd: "/" }), "~ ~ >");
  assert.equal(formatPrompt("{nope} $", { ...site, cwd: "/" }), "{nope} $");
});

test("complete reports the untouched head of the line, for clickable candidates", () => {
  const shell = make();
  const { head, candidates } = shell.complete("cat blog/");
  assert.equal(head, "cat ");
  assert.deepEqual(candidates.map((candidate) => head + candidate), ["cat blog/first.md ", "cat blog/second.md "]);
});

// ── Scratch files ────────────────────────────────────────────────────

function withScratch(initial = {}) {
  let stored = { ...initial };
  const storage = { read: () => stored, write: (files) => (stored = { ...files }) };
  const shell = createShell({ nodes, python: true, scratch: true, storage, loadSearch: async () => docs });
  return { shell, stored: () => stored };
}
const message = (result) => result.out[0]?.text;

test("the scratch folder is mounted next to the pages and lists stored files", async () => {
  const { shell } = withScratch({ "a.py": "print(1)\n" });
  assert.deepEqual(labels(await shell.run("ls")), ["blog/", "guide/", "scratch/", "index.md"]);
  const items = (await shell.run("ls scratch")).out[0].items;
  assert.deepEqual(items.map((item) => [item.label, item.meta]), [["a.py", "9 B"]]);
  assert.equal(nodes["/"].children.includes("scratch"), false); // the site's tree is not modified
});

test("touch, cat, cp, mv and rm work on scratch files and persist", async () => {
  const { shell, stored } = withScratch();
  await shell.run("touch notes.txt"); // a bare name lands in the scratch folder
  assert.deepEqual(stored(), { "notes.txt": "" });
  assert.equal(shell.writeFile("/scratch/notes.txt", "line one\n"), null);
  assert.equal(message(await shell.run("cat notes.txt")), "line one");
  await shell.run("cp notes.txt copy.txt");
  await shell.run("mv copy.txt renamed.txt");
  assert.deepEqual(Object.keys(stored()).sort(), ["notes.txt", "renamed.txt"]);
  await shell.run("cp ~/index.md page.md"); // a page's markdown can be copied in
  assert.equal(stored()["page.md"], "# Home\nWelcome to the Site");
  await shell.run("rm notes.txt renamed.txt page.md");
  assert.deepEqual(stored(), {});
  assert.match(message(await shell.run("rm nope.txt")), /No such file/);
});

test("everything outside the scratch folder is read-only", async () => {
  const { shell, stored } = withScratch();
  assert.match(message(await shell.run("touch ~/blog/x.txt")), /Read-only file system \(files live in ~\/scratch\)/);
  assert.match(message(await shell.run("rm ~/index.md")), /Read-only file system/);
  assert.match(message(await shell.run("edit ~/index.md")), /Read-only file \(copy it first: cp ~\/index.md ~\/scratch\/\)/);
  assert.match(message(await shell.run("touch scratch/sub/x.txt")), /Read-only file system/); // no subfolders
  assert.deepEqual(stored(), {});
});

test("edit and python resolve scripts", async () => {
  const { shell } = withScratch({ "run.py": "print('x')\n" });
  assert.equal((await shell.run("edit new.py")).edit, "/scratch/new.py");
  assert.equal((await shell.run("nano run.py")).edit, "/scratch/run.py");
  assert.equal((await shell.run("vim ~/scratch/run.py")).edit, "/scratch/run.py");
  assert.match(message(await shell.run("edit scratch")), /Is a directory/);
  assert.deepEqual((await shell.run("python run.py")).python, { code: "print('x')\n", filename: "run.py" });
  assert.match(message(await shell.run("python ~/index.md")), /not a script/);
  assert.match(message(await shell.run("python missing.py")), /No such file/);
});

test("files written by Python replace the scratch folder, within the limits", async () => {
  const { shell, stored } = withScratch({ "old.txt": "x" });
  shell.importFiles({ "out.txt": "made by python", "sub/skip.txt": "no", "huge.bin": "x".repeat(300 * 1024) });
  assert.deepEqual(stored(), { "out.txt": "made by python" });
  assert.deepEqual(shell.exportFiles(), { "out.txt": "made by python" });
  assert.equal(shell.writeFile("/scratch/big.txt", "x".repeat(300 * 1024)), "File too large");
});

test("exit asks for a restart, and scratch commands need the feature", async () => {
  assert.equal((await make().run("exit")).exit, true);
  assert.equal((await make().run("logout")).exit, true);
  assert.equal(message(await make().run("edit x.py")), "edit: not enabled on this site");
  assert.equal(message(await make().run("vim x.py")), "vim: not enabled on this site");
  const usages = (await make().run("help")).out[0].rows.map((row) => row.usage);
  assert.ok(usages.includes("exit") && !usages.some((usage) => usage.startsWith("edit")));
});
