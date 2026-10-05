import assert from "node:assert/strict";
import { test } from "node:test";

import { createShell } from "../../src/md_term/assets/js/shell.js";
import { display, quote, resolve, tokenize } from "../../src/md_term/assets/js/vfs.js";

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
