---
title: Writing pages
description: Front matter, links between pages, posts and tags.
---

# Writing pages

Every `.md` file inside `docs/` becomes a page. The folder structure is the
site structure: `docs/guide/commands.md` shows up in the shell as
`~/guide/commands.md` and is published at `/guide/commands/`.

## Front matter

The YAML header is optional:

```yaml
---
title: A title
date: 2026-10-05
tags: [python, notes]
description: Summary used by search engines and the feed.
draft: true
---
```

| Field         | Effect                                                   |
| ------------- | -------------------------------------------------------- |
| `title`       | page title; without it the first `# heading` is used     |
| `date`        | turns the page into a post                               |
| `tags`        | groups pages; see `tags` and `tag <name>`                |
| `description` | summary; without it the first paragraph is used          |
| `draft`       | left out of `build`, but shown by `serve`                |

## Links and images

Write relative links to the `.md` file, as you would on GitHub:

```markdown
See the [configuration](configuration.md) or the [blog](../blog/hello-world.md).
```

md-term rewrites those links to the final URLs and warns during the build
when the target does not exist. Images and other files in `docs/` are copied
to the site at the same path.

> [!NOTE]
> Only markdown links and images are rewritten. A path inside raw HTML, such
> as `<img src="...">`, is published exactly as written.

## Posts

A page with a `date` is a post: it appears in the `posts` command, on its
tag pages and in the RSS feed (`feed.xml`), which needs `site_url` in the
[configuration](configuration.md).

## Formatting

Everything the renderer understands, from tables to formulas and diagrams,
is shown on the [Markdown](markdown.md) page.
