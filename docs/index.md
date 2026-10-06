# md-term

**md-term** turns a folder of markdown files into a static site that looks
and works like a terminal. Think of mkdocs, except that visitors browse the
content the way they would use a shell.

```console
$ ls
blog/  guide/  reference/  index.md
$ cat guide/installation.md
```

## Where to start

- [Installation](guide/installation.md): create and build your first site
- [Writing pages](guide/writing.md): front matter, links and posts
- [Markdown](guide/markdown.md): alerts, formulas, diagrams and the rest
- [Shell commands](guide/commands.md): everything a visitor can type
- [Configuration](guide/configuration.md): the options in `md-term.toml`
- [Themes and colors](guide/themes.md): the built-in themes and how to make your own
- [Python in the browser](guide/python.md): a REPL and runnable code blocks
- [Publishing](guide/publishing.md): GitHub Pages and other hosts

## Reference

- [Command line](reference/cli.md): `new`, `serve` and `build`
- [How it works](reference/architecture.md): what the build writes and how the
  shell navigates

## The idea

Every `.md` file becomes a complete HTML page, so the site works without
JavaScript, search engines can index it and any address can be shared. With
JavaScript on, the page gains a real prompt: `ls`, `cd`, `cat`, `grep`,
history and tab completion.

News goes to the [blog](blog/color-themes.md).
