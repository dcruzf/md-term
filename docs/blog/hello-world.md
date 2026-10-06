---
title: Hello, world
date: 2026-10-05
tags: [news, md-term]
description: The first version of md-term.
---

# Hello, world

This is the first version of md-term: a static site generator for people
who like to read documentation in a monospaced font.

What already works:

- static pages, readable even without JavaScript
- a shell with `ls`, `cd`, `cat`, `tree` and `grep`
- posts with dates, tags and an RSS feed

```python
def greet(name: str) -> str:
    # syntax highlighting happens during the build
    return f"hello, {name}"


print(greet("world"))
```

The details are in the [guide](../guide/installation.md).
