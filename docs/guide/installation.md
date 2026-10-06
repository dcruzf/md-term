---
title: Installation
description: How to install md-term and build your first site.
---

# Installation

md-term needs Python 3.11 or newer.

```bash
pip install md-term
```

## Your first site

```bash
md-term new my-site
cd my-site
md-term serve
```

`new` creates an `md-term.toml` and a `docs/` folder with two sample pages.
`serve` opens the site at <http://127.0.0.1:8000/> and rebuilds it every time
a file is saved, drafts included.

## Building

```bash
md-term build
```

The result goes to `site/`: static files only, ready for any host. Links are
relative, so the same build works at the root of a domain and under a
subpath such as `user.github.io/project/`.

| Command         | What it does                                       |
| --------------- | -------------------------------------------------- |
| `md-term new`   | creates a starter site                             |
| `md-term serve` | local server with automatic reload                 |
| `md-term build` | writes the static site (`--drafts` includes drafts) |

Every option is described in the [command line reference](../reference/cli.md).

Next: [writing pages](writing.md).
