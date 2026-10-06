from __future__ import annotations

import datetime as dt
from pathlib import Path

from .config import CONFIG_NAME, MdTermError

CONFIG = """\
site_name = "my-site"
description = "Notes from the terminal"
# Public address of the site. Required for the RSS feed.
site_url = ""
lang = "en"

# Shown in the prompt as user@host.
user = "guest"
host = "my-site"
# Prompt format. Placeholders: {user}, {host}, {path} (~/blog) and {dir} (blog).
# ps1 = "{user}@{host}:{path}$"

# Greeting printed on the home page.
motd = "Welcome. Type 'help' or click a command above."

# Color theme: phosphor, amber, ice, mono, dracula or paper.
theme = "phosphor"

# Python REPL and runnable code blocks, running in the visitor's browser.
# python = true

# Override individual colors of the theme.
# [colors]
# fg_bright = "#00ff9c"
"""

INDEX = """\
# Welcome

This site is a folder of markdown files. Browse it like a shell:

- `ls` lists the current directory
- `cat <file>` opens a page
- `grep <pattern>` searches every page
- `posts` lists dated pages, newest first

Start with the [first post](blog/hello-world.md).
"""

POST = """\
---
title: Hello, world
date: {today}
tags: [meta]
---

Any page with a `date` in its front matter is a post. Posts show up in
`posts`, on their tag pages and in the RSS feed.

```python
print("hello from md-term")
```
"""


def scaffold(directory: Path) -> list[Path]:
    files = {
        directory / CONFIG_NAME: CONFIG,
        directory / "docs" / "index.md": INDEX,
        directory / "docs" / "blog" / "hello-world.md": POST.format(
            today=dt.datetime.now().astimezone().date()
        ),
    }
    existing = [path for path in files if path.exists()]
    if existing:
        raise MdTermError(f"refusing to overwrite {existing[0]}")
    for path, text in files.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    return list(files)
