---
title: Obsidian vaults
description: Publishing a folder of an Obsidian vault, and which Obsidian syntax is understood.
---

# Obsidian vaults

A folder of an [Obsidian](https://obsidian.md/) vault can be the `docs/`
folder of a site as it is. md-term understands the syntax Obsidian adds to
markdown, so notes do not have to be rewritten.

```toml
docs_dir = "/path/to/vault/site"
```

The `.obsidian` folder, like anything else starting with a dot, is ignored.

## Links between notes

```markdown
[[Another note]]
[[Another note|with other words]]
[[Another note#A heading]]
[[folder/Another note]]
[[#A heading on this page]]
```

A link is resolved the way Obsidian does it: by path from the root of the
folder, by path relative to the note, or by name alone. When two notes share
a name, the one closest to the root wins and the build warns about it.
Upper and lower case are not told apart.

A link to a note that does not exist is shown as dashed text instead of a
dead link, and the build warns:

```text
WARNING: Notes/idea.md: broken link to [[Nowhere]]
```

> [!WARNING]
> Only notes inside the published folder exist for the site. A link from
> there to a note elsewhere in the vault is a broken link.

## Images

```markdown
![[diagram.png]]
![[diagram.png|300]]
![[diagram.png|A description]]
```

The number is the width in pixels. Embedding a note (`![[Another note]]`)
does not copy its content: it becomes a link to that note.

## Callouts

Every Obsidian callout works, with its own title and folding:

```markdown
> [!question] Does it fold?
> Yes: a `-` starts it closed, a `+` starts it open.

> [!example]- Click to open
> Hidden until opened.
```

> [!question] Does it fold?
> Yes: a `-` starts it closed, a `+` starts it open.

> [!example]- Click to open
> Hidden until opened.

Warning-like types (`warning`, `caution`, `danger`, `error`, `failure`,
`bug`) use the alert color of the theme; the others use the bright color.

## Keeping things private

| In the note                 | Effect                                          |
| --------------------------- | ----------------------------------------------- |
| `publish: false` (front matter) | the note is left out, like `draft: true`    |
| `draft: true` (front matter)    | the note is left out of `build`             |
| `%%a comment%%`             | removed from the page and from the search index |

Comments are removed everywhere except inside fenced code blocks.

## Properties

Obsidian's properties are the front matter. `title`, `date`, `tags` and
`description` mean what they mean [everywhere else](writing.md#front-matter);
other properties, such as `aliases`, are ignored.

## Not supported

- inline `#tags` in the text: use the `tags` property
- `==highlighted text==`
- note transclusion, block references (`[[note^block]]`) and Dataview queries
- canvases and other non-markdown files, which are copied but not rendered

## Publishing as you write

To have the site follow the vault with no deploy step, run the build in
watch mode next to a web server. See
[Publishing continuously](publishing.md#publishing-continuously).
