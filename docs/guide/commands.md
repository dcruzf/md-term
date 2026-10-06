---
title: Shell commands
description: Reference of the commands available to visitors.
---

# Shell commands

The prompt sits right after the last output, as in a real terminal. Start
typing anywhere on the page to return to it. Everything a command lists is
clickable too, so the site can be browsed without typing at all.

| Command                        | What it does                                   |
| ------------------------------ | ---------------------------------------------- |
| `help`                         | lists the commands                             |
| `ls [path]`                    | lists a directory                              |
| `cd [dir]`                     | changes directory; no argument goes back to `~` |
| `pwd`                          | prints the current directory                   |
| `tree [dir]`                   | shows a directory as a tree                    |
| `cat <file>`                   | opens a page (also `open`)                     |
| `grep [-i] <pattern> [path]`   | searches every page (also `search`)            |
| `posts`                        | lists posts, newest first                      |
| `tags`                         | lists the tags                                 |
| `tag <name>`                   | lists the pages carrying a tag                 |
| `python [-c code]`             | opens the [Python REPL](python.md), if the site enables it |
| `theme [name]`                 | lists the [themes](themes.md) or switches to one |
| `history`                      | shows the commands typed so far                |
| `clear`                        | clears the screen                              |

## Shortcuts

- <kbd>Tab</kbd> completes commands, paths, tags and themes
- <kbd>↑</kbd> and <kbd>↓</kbd> walk the history
- <kbd>Ctrl</kbd>+<kbd>L</kbd> clears the screen and <kbd>Ctrl</kbd>+<kbd>C</kbd> discards the line

## Search

`grep` looks through the original markdown line by line and accepts regular
expressions. A pattern written entirely in lowercase ignores case:

```console
$ grep front.matter
$ grep "site_url" guide
$ grep -i RSS
```

## Paths

`~` is the root of the site. Relative paths and `..` work, and the `.md`
extension is optional for `cat`:

```console
$ cd guide
$ cat ../blog/hello-world
```
