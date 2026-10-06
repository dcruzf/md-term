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
| `icon`            | a `>_` tile              | the [favicon](#icon)                            |
| `theme`           | `phosphor`               | [color theme](themes.md): `phosphor`, `amber`, `ice`, `mono`, `dracula` or `paper` |
| `[colors]`        | empty                    | colors that replace the theme's                 |
| `extra_css`       | empty                    | style sheets from `docs/`, loaded after the default one |
| `python`          | `false`                  | [Python in the browser](python.md): `true`, `"monty"` or `"pyodide"` |
| `python_packages` | empty                    | packages installed up front, `"pyodide"` only   |

An unknown option, or one with the wrong type, stops the build with a
message naming it.

## Settings in the home page

The wording and look of the site can also be set from the front matter of
the home page, the `index.md` at the root of the docs folder. This is handy
when the notes are written somewhere the configuration file is not, such as
an [Obsidian vault](obsidian.md): the properties of one note control the
site.

```yaml
---
title: Home
site_name: Field Notes
site_description: thinking out loud
site_theme: amber
---
```

| Property           | Replaces      |
| ------------------ | ------------- |
| `site_name`        | `site_name`   |
| `site_description` | `description` |
| `site_lang`        | `lang`        |
| `site_user`        | `user`        |
| `site_host`        | `host`        |
| `site_ps1`         | `ps1`         |
| `site_motd`        | `motd`        |
| `site_theme`       | `theme`       |
| `site_icon`        | `icon`        |

A property that is present wins over `md-term.toml`; one that is missing or
empty leaves the file's value alone. The values are checked like the file's:
an unknown theme, for example, stops the build with a message naming
`index.md`.

Only these nine can be set this way, and only on the root `index.md`; the
same properties on any other page are ignored. Paths, `site_url`, colors,
extra CSS and Python stay in `md-term.toml`.

> [!NOTE]
> `title` and `description` keep their usual meaning: they describe the home
> *page*. The site's name and tagline are `site_name` and `site_description`.

## Icon

The `icon` option sets the favicon, the small image in the browser tab. It
accepts these kinds of value:

| Value                         | Example                          | Result                                  |
| ----------------------------- | -------------------------------- | --------------------------------------- |
| nothing                       |                                  | a `>_` tile in the theme's colors       |
| an emoji                      | `"🦊"`                           | the emoji                               |
| one to three characters       | `"dc"`                           | a tile with that text, in the theme's colors |
| a file in the docs folder     | `"assets/logo.png"`              | that image (`.svg`, `.png` or `.ico`)   |
| an icon from a public set     | `"mdi:console"`                  | the icon, tinted with the theme's bright color |
| a web address                 | `"https://example.com/logo.svg"` | whatever is published there             |

```toml
icon = "mdi:console"
```

- **Files** can be named by path from the docs root or by file name alone;
  when two files share a name, the one closest to the root is used. A file
  that is not found makes the build warn and fall back to the default tile.
- **Icon sets** use the `set:name` form of [Iconify](https://icon-sets.iconify.design/),
  which gathers more than a hundred open icon sets: `mdi:console`,
  `lucide:terminal`, `tabler:brand-python`. Browse the catalogue there and
  copy the name. The image is fetched by the visitor's browser from
  `api.iconify.design`; a wrong name simply shows no icon.
- **Tiles and tints** use the colors of the theme set in the configuration.
  They do not follow a visitor who switches themes with the `theme` command.

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
