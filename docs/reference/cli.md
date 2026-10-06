---
title: Command line
description: Reference of the md-term new, serve and build commands.
---

# Command line

```console
$ md-term --help
$ md-term --version
```

Every command looks for `md-term.toml` in the current folder. Use `-f` to
point at another file; the `docs_dir` and `site_dir` paths are relative to
the folder that file is in.

## md-term new

```console
$ md-term new [DIRECTORY]
```

Creates a starter site in `DIRECTORY` (default: the current folder), with:

- `md-term.toml`
- `docs/index.md`
- `docs/blog/hello-world.md`

The command overwrites nothing: if any of those files exists, it stops with
an error.

## md-term serve

```console
$ md-term serve [-f FILE] [-a HOST:PORT]
```

Builds the site and serves it locally, by default at `127.0.0.1:8000`.

| Option                | Default          | Effect                         |
| --------------------- | ---------------- | ------------------------------ |
| `-f`, `--config-file` | `md-term.toml`   | configuration file             |
| `-a`, `--addr`        | `127.0.0.1:8000` | address and port of the server |

While it runs it watches the docs folder and the configuration file. On
every change the site is rebuilt and the browser reloads by itself. Drafts
are included. A build error is printed to the terminal and the server stays
up with the last good version.

To expose the server on the local network:

```console
$ md-term serve -a 0.0.0.0:8000
```

## md-term build

```console
$ md-term build [-f FILE] [--drafts]
```

Writes the static site to `site_dir`.

| Option                | Default        | Effect                            |
| --------------------- | -------------- | --------------------------------- |
| `-f`, `--config-file` | `md-term.toml` | configuration file                |
| `--drafts`            | off            | includes pages with `draft: true` |

### Warnings and errors

The build warns, without stopping, when:

- a link points to an `.md` file that does not exist
- a formula cannot be converted
- there are posts but `site_url` is empty, so no feed is written
- a file listed in `extra_css` does not exist in `docs/`

And it stops with an error when:

- the front matter is invalid, or `date` is not in `YYYY-MM-DD` format
- two files produce the same URL, such as `guide.md` and `guide/index.md`
- a file uses a [reserved path](../guide/configuration.md#reserved-paths)
- `md-term.toml` has an unknown option, a theme that does not exist, an
  invalid color or an unknown prompt placeholder
- `site_dir` is not empty and was not created by md-term
- `python = "monty"` and the interpreter is neither cached nor downloadable

See [how to publish](../guide/publishing.md) the result.
