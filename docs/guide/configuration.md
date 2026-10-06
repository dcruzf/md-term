---
title: Configuration
description: Every option of the md-term.toml file.
---

# Configuration

A site is configured by the `md-term.toml` file at the root of the project.
Every option is optional.

```toml
site_name = "my-site"
description = "Notes in text mode"
site_url = "https://example.com/"
lang = "en"

user = "guest"
host = "my-site"
motd = "Welcome. Type 'help'."

theme = "amber"
extra_css = ["assets/custom.css"]
python = "pyodide"

[colors]
alert = "#ff3b3b"
```

> [!IMPORTANT]
> In TOML, plain options must come before any table such as `[colors]`.

| Option            | Default                  | Purpose                                         |
| ----------------- | ------------------------ | ----------------------------------------------- |
| `site_name`       | `md-term`                | name shown in the title bar                     |
| `description`     | empty                    | tagline and feed description                    |
| `site_url`        | empty                    | public address; without it no feed is written   |
| `lang`            | `en`                     | language declared by the pages                  |
| `docs_dir`        | `docs`                   | folder holding the markdown                     |
| `site_dir`        | `site`                   | output folder, wiped on every build             |
| `user`            | `guest`                  | user shown in the prompt                        |
| `host`            | from the site name       | machine shown in the prompt                     |
| `ps1`             | `{user}@{host}:{path}$`  | [prompt format](#prompt)                        |
| `motd`            | empty                    | message printed on the home page                |
| `theme`           | `phosphor`               | [color theme](themes.md): `phosphor`, `amber`, `ice`, `mono`, `dracula` or `paper` |
| `[colors]`        | empty                    | colors that replace the theme's                 |
| `extra_css`       | empty                    | style sheets from `docs/`, loaded after the default one |
| `python`          | `false`                  | [Python in the browser](python.md): `true`, `"monty"` or `"pyodide"` |
| `python_packages` | empty                    | packages installed up front, `"pyodide"` only   |

An unknown option, or one with the wrong type, stops the build with a
message naming it.

## Prompt

The `ps1` option sets the prompt format. It takes free text and four
placeholders:

| Placeholder | Becomes                | Example in `~/guide/advanced` |
| ----------- | ---------------------- | ----------------------------- |
| `{user}`    | the value of `user`    | `guest`                       |
| `{host}`    | the value of `host`    | `md-term`                     |
| `{path}`    | the full path          | `~/guide/advanced`            |
| `{dir}`     | the current folder only | `advanced`                   |

At the root of the site, `{path}` and `{dir}` are both `~`.

| `ps1`                       | Result                         |
| --------------------------- | ------------------------------ |
| `"{user}@{host}:{path}$"`   | `guest@md-term:~/guide$`       |
| `"{path} >"`                | `~/guide >`                    |
| `"λ {dir}"`                 | `λ guide`                      |
| `"[{host}] {path} #"`       | `[md-term] ~/guide #`          |
| `"C:\\{dir}>"`              | `C:\guide>`                    |

An unknown placeholder, such as `{date}`, stops the build. In TOML a
backslash inside double quotes must be doubled; inside single quotes
(`'C:\{dir}>'`) it is literal.

The prompts of the Python REPL (`>>>` and `...`) cannot be changed.

## Appearance

Themes, colors, fonts and effects have a page of their own:
[Themes and colors](themes.md).

## Reserved paths

The build writes `tags/`, `fs.json`, `search.json` and `feed.xml`. Files in
`docs/` with those names cause an error. With Python enabled it also writes
to `assets/python/`.
