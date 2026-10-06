---
title: Python in the browser
description: How to enable the Python REPL and runnable code blocks, and what each interpreter supports.
---

# Python in the browser

md-term can offer a Python interpreter that runs entirely in the visitor's
browser, with no server. It is optional and off by default. There are two
interpreters to choose from:

```toml
python = "monty"     # light and fast, a subset of Python
python = "pyodide"   # full Python, with packages
```

`python = true` is the same as `"monty"`.

## Which one to choose

|                         | `monty`                          | `pyodide`                                 |
| ----------------------- | -------------------------------- | ----------------------------------------- |
| Language                | a subset of Python               | full CPython 3.14                         |
| Standard library        | 19 modules                       | practically all of it                     |
| Packages                | none                             | `numpy`, `pandas`... and pure-Python PyPI |
| First download          | 22.6 MB (4.4 to 7.1 compressed)  | 12.3 MB (about 6 compressed)              |
| Startup                 | under 1 second                   | about 3 seconds                           |
| Served from             | your own site                    | a public CDN (jsDelivr)                   |
| Size added to the site  | about 23 MB                      | 4 KB                                      |
| Limit per run           | 10 seconds and 256 MB            | none; stop it with <kbd>Ctrl</kbd>+<kbd>C</kbd> |
| After an interrupt      | restarts at once                 | restarts in about 2 seconds               |

Use `monty` for simple teaching snippets, when a fast start and independence
from third parties matter. Use `pyodide` when the examples need inheritance,
generators, libraries or packages.

With either one the site gains:

- the `python` command, which opens a REPL
- `python -c "code"`, to run one line
- a `[run]` link on every Python code block in the articles

This site uses `pyodide`. Try clicking `[run]`:

```python
from statistics import mean


class Shape:
    def area(self) -> float:
        raise NotImplementedError


class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width, self.height = width, height

    def area(self) -> float:
        return self.width * self.height


def squares(limit: int):
    for side in range(1, limit + 1):
        yield Rectangle(side, side)


areas = [shape.area() for shape in squares(4)]
print(areas, "mean:", mean(areas))
```

Inheritance, generators and the `statistics` module are things only
`pyodide` runs. An example with a package, which downloads `numpy` the first
time it runs:

```python
import numpy as np

matrix = np.arange(12).reshape(3, 4)
print(matrix)
print("column sums:", matrix.sum(axis=0))
```

## The REPL

```console
$ python
>>> x = [n * n for n in range(5)]
>>> sum(x)
30
>>> def double(n):
...     return n * 2
...
>>> double(21)
42
>>> exit()
```

- A block (`def`, `for`, `if`...) runs when you send an empty line.
- <kbd>Tab</kbd> inserts four spaces; <kbd>↑</kbd> and <kbd>↓</kbd> walk the
  REPL's own history.
- `_` holds the last value shown.
- <kbd>Ctrl</kbd>+<kbd>C</kbd> interrupts running code. <kbd>Ctrl</kbd>+<kbd>D</kbd>
  or `exit()` go back to the shell.
- Variables live for as long as the page is open, and are shared by the
  REPL, `python -c` and the `[run]` blocks.

## Download on demand

Nothing of the interpreter is downloaded when the site opens. The download
happens the first time a visitor uses Python, with a progress bar in the
terminal:

```text
Downloading Python [#########...........]  48%  5.9/12.3 MB
```

The browser caches the files, so later visits do not download them again.

## Pyodide

[Pyodide](https://pyodide.org/) is CPython compiled to WebAssembly.

### Packages

There are three ways to get a package.

**Just import it.** Packages from the Pyodide distribution, such as `numpy`,
`pandas`, `scipy` and `matplotlib`, are downloaded on the first `import`:

```console
>>> import numpy as np
Loading numpy
Loaded numpy
>>> np.arange(6).reshape(2, 3).sum(axis=0)
array([3, 5, 7])
```

**Install it with `micropip`.** Pure-Python packages from PyPI are installed
from the REPL, which accepts `await` right at the prompt:

```console
>>> import micropip
>>> await micropip.install("cowsay")
>>> import cowsay
```

**List it in the configuration.** For the site to start with packages
already installed:

```toml
python = "pyodide"
python_packages = ["numpy", "rich==13.7.0"]
```

They are downloaded together with the interpreter, the first time a visitor
uses Python, and they come back by themselves after a session restart.

> [!NOTE]
> In a `[run]` block, importing a package from the distribution works
> directly. A package that exists only on PyPI must be listed in
> `python_packages`, or the block itself must call
> `await micropip.install(...)`.

A package with a C extension that nobody ported to Pyodide does not install.

### Limitations

- There are no sockets, threads or subprocesses. HTTP requests go through
  the browser and depend on the target server allowing them (CORS).
- `input()` does not work.
- The interpreter comes from `cdn.jsdelivr.net`. Without access to that
  address Python does not load; the rest of the site keeps working.

> [!WARNING]
> There is no time limit: an infinite loop runs until
> <kbd>Ctrl</kbd>+<kbd>C</kbd>. On a phone, where that key combination does
> not exist, the way out is to reload the page.

## Monty

[Monty](https://github.com/pydantic/monty), by Pydantic, is a subset of
Python written in Rust. It starts quickly and is easy to interrupt, but it
is not the full language.

| Works                                              | Does not work                                 |
| -------------------------------------------------- | --------------------------------------------- |
| functions, closures, `lambda`, function decorators | class inheritance                             |
| simple classes and `@dataclass`                    | `yield` and generators                        |
| f-strings, comprehensions, unpacking               | `@property`, `@staticmethod`, `@classmethod`  |
| `try`/`except`/`finally`, `with`, `async`/`await`  | `match`, `del`                                |
| `print()`                                          | `input()`                                     |

Available modules: `asyncio`, `base64`, `binascii`, `collections`, `copy`,
`dataclasses`, `datetime`, `functools`, `itertools`, `json`, `math`, `os`,
`pathlib`, `random`, `re`, `sys`, `time`, `typing` and `unicodedata`. There
is no way to install packages: `import numpy` fails.

Unsupported syntax produces a clear error, for example:

```text
NotImplementedError: The monty syntax parser does not yet support class inheritance and metaclasses
```

The full list of differences is in the
[Monty documentation](https://github.com/pydantic/monty/tree/main/docs/limitations).

Each run is limited to 10 seconds and 256 MB of memory. When a limit is hit,
the session restarts.

## Sessions and isolation

- After an interrupt or a limit, the session restarts and variables are
  lost. The terminal says so when it happens.
- The code runs isolated in a Web Worker: it cannot reach the page or the
  visitor's files.

## At build time

With `pyodide`, the build only copies one small file to
`site/assets/python/` and needs no network.

With `monty`, the first `md-term build` downloads the interpreter from the
npm registry (the `@pydantic/monty` package), checks its contents against
hashes pinned in md-term and keeps it in `~/.cache/md-term/`. Later builds
use the cache and work offline. The files go to `site/assets/python/`, which
adds about 23 MB to the published site.

| Variable         | Effect                                           |
| ---------------- | ------------------------------------------------ |
| `MD_TERM_CACHE`  | cache folder, instead of `~/.cache/md-term`      |
| `XDG_CACHE_HOME` | base of the cache when `MD_TERM_CACHE` is not set |
