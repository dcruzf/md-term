---
title: Publishing
description: How to build the site and host it on GitHub Pages or any static server.
---

# Publishing

`md-term build` writes a `site/` folder holding static files only. Any file
host will do: GitHub Pages, Netlify, Cloudflare Pages, an S3 bucket or nginx.

```bash
md-term build
```

## Before you publish

- Set `site_url` in `md-term.toml` to the public address. Without it no RSS
  feed is written, because the links in a feed must be absolute.
- Drafts (`draft: true`) are left out of the build. Use `--drafts` to include
  them in a preview environment.
- Read the build warnings: links to `.md` files that do not exist and
  formulas that could not be rendered are listed there.
- With `python = "monty"`, the first build needs the network to download the
  interpreter, and the published site grows by about 23 MB. With `"pyodide"`
  neither applies: the visitor's browser fetches it from a CDN.

## Subpaths

Every internal link is relative. The same build works at the root of a
domain (`https://example.com/`) and under a subpath
(`https://user.github.io/project/`), with no extra option.

## GitHub Pages

A workflow that publishes on every push to `main`. Save it as
`.github/workflows/site.yml` and, in the repository settings, choose
"GitHub Actions" as the Pages source.

```yaml
name: site
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install md-term
      - run: md-term build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Other hosts

On services that build the site for you, set:

| Field             | Value                                  |
| ----------------- | -------------------------------------- |
| build command     | `pip install md-term && md-term build` |
| publish directory | `site`                                 |

On your own server, copying the folder is enough:

```bash
md-term build
rsync -av --delete site/ user@server:/var/www/my-site/
```

The server must answer with `index.html` when an address ends in `/`, which
is the default behavior of practically all of them.

## The site/ folder

The build wipes and recreates `site/` on every run. For safety it refuses to
wipe a folder that is not empty and was not created by md-term itself.

> [!WARNING]
> Do not edit files inside `site/`: the changes are lost on the next build.
> The folder does not need to be under version control.
