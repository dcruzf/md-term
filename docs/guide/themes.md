---
title: Themes and colors
description: The built-in themes of md-term and the ways to change colors, fonts and effects.
---

# Themes and colors

There are four ways to change the look, from the simplest to the most open:

1. [pick a built-in theme](#built-in-themes)
2. [adjust colors in `md-term.toml`](#your-own-colors)
3. [add CSS](#extra-css) for fonts, width and effects
4. [replace the whole style sheet](#replacing-the-css)

## Built-in themes

| Theme | Palette | Description |
| --- | --- | --- |
| `phosphor` | <span title="#030b06" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#030b06;border:1px solid #888"></span><span title="#08170d" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#08170d;border:1px solid #888"></span><span title="#9be8ae" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#9be8ae;border:1px solid #888"></span><span title="#4dff88" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#4dff88;border:1px solid #888"></span><span title="#4c9462" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#4c9462;border:1px solid #888"></span><span title="#17402a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#17402a;border:1px solid #888"></span><span title="#ffb454" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffb454;border:1px solid #888"></span> | green phosphor, the default |
| `amber` | <span title="#0c0700" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#0c0700;border:1px solid #888"></span><span title="#1a1003" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#1a1003;border:1px solid #888"></span><span title="#f2c078" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#f2c078;border:1px solid #888"></span><span title="#ffb000" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffb000;border:1px solid #888"></span><span title="#a3742a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#a3742a;border:1px solid #888"></span><span title="#46300c" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#46300c;border:1px solid #888"></span><span title="#ff6b4a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ff6b4a;border:1px solid #888"></span> | amber monitor |
| `ice` | <span title="#030910" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#030910;border:1px solid #888"></span><span title="#081624" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#081624;border:1px solid #888"></span><span title="#a9d6f5" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#a9d6f5;border:1px solid #888"></span><span title="#5cc8ff" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#5cc8ff;border:1px solid #888"></span><span title="#4f86ad" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#4f86ad;border:1px solid #888"></span><span title="#173650" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#173650;border:1px solid #888"></span><span title="#ffd166" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffd166;border:1px solid #888"></span> | cold blue |
| `mono` | <span title="#0a0a0a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#0a0a0a;border:1px solid #888"></span><span title="#161616" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#161616;border:1px solid #888"></span><span title="#d0d0d0" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#d0d0d0;border:1px solid #888"></span><span title="#ffffff" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffffff;border:1px solid #888"></span><span title="#858585" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#858585;border:1px solid #888"></span><span title="#333333" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#333333;border:1px solid #888"></span><span title="#ffcc66" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffcc66;border:1px solid #888"></span> | neutral grey on black |
| `dracula` | <span title="#282a36" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#282a36;border:1px solid #888"></span><span title="#343746" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#343746;border:1px solid #888"></span><span title="#f8f8f2" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#f8f8f2;border:1px solid #888"></span><span title="#bd93f9" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#bd93f9;border:1px solid #888"></span><span title="#8b98c9" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#8b98c9;border:1px solid #888"></span><span title="#44475a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#44475a;border:1px solid #888"></span><span title="#ff79c6" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ff79c6;border:1px solid #888"></span> | the [Dracula](https://draculatheme.com/) palette, purple on graphite |
| `paper` | <span title="#f4f1e8" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#f4f1e8;border:1px solid #888"></span><span title="#e9e5d8" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#e9e5d8;border:1px solid #888"></span><span title="#2b2b26" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#2b2b26;border:1px solid #888"></span><span title="#000000" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#000000;border:1px solid #888"></span><span title="#6b6a60" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#6b6a60;border:1px solid #888"></span><span title="#c9c4b3" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#c9c4b3;border:1px solid #888"></span><span title="#b3261e" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#b3261e;border:1px solid #888"></span> | light, for reading in daylight |

The swatches follow the order of the variables: background, raised
background, text, bright text, dim text, lines and alert.

Choose the theme of the site in `md-term.toml`:

```toml
theme = "amber"
```

### Trying them out

Visitors can switch themes from the shell. Their choice is saved in their
browser and applies to the whole site:

```console
$ theme
$ theme amber
$ theme paper
```

Try it now: type `theme ice`, or click `[theme]` in the command bar. To go
back to the theme of this site, `theme phosphor`.

## Your own colors

The `[colors]` table redefines colors of the chosen theme. List only what
changes; the rest comes from the theme.

```toml
theme = "phosphor"

[colors]
fg_bright = "#00ff9c"
alert = "#ff5c8a"
```

| Key         | CSS variable  | Where it shows                                  |
| ----------- | ------------- | ----------------------------------------------- |
| `bg`        | `--bg`        | page background                                 |
| `bg_raised` | `--bg-raised` | code blocks, alerts and the glow behind the page |
| `fg`        | `--fg`        | body text                                       |
| `fg_bright` | `--fg-bright` | headings, links, commands, bold text            |
| `fg_dim`    | `--fg-dim`    | prompt, metadata, decorative punctuation        |
| `line`      | `--line`      | borders and rules                               |
| `alert`     | `--alert`     | errors, `grep` hits, strings in code, warnings  |
| `glow`      | `--glow`      | halo of bright text; `transparent` turns it off |

Values accept any CSS color: `#rrggbb`, `rgb(...)`, `hsl(...)` or a name such
as `black`.

> [!NOTE]
> The colors in `[colors]` apply to the theme set in `theme`. A visitor who
> switches to another theme with the `theme` command sees that theme's
> original palette.

### Sample palettes

A complete palette, Matrix style:

```toml
[colors]
bg = "#000000"
bg_raised = "#001a00"
fg = "#00c853"
fg_bright = "#69ff97"
fg_dim = "#007a33"
line = "#003d1a"
alert = "#ffffff"
```

Purple on black, darker than `dracula`:

```toml
[colors]
bg = "#0d0b12"
bg_raised = "#17131f"
fg = "#cfc6e6"
fg_bright = "#c49bff"
fg_dim = "#7d7399"
line = "#352d4a"
alert = "#ffb86c"
```

A light sepia theme, starting from `paper`:

```toml
theme = "paper"

[colors]
bg = "#f6efe0"
bg_raised = "#ebe2cd"
fg = "#3b3024"
fg_bright = "#1f1408"
alert = "#a8421c"
```

### Choosing good colors

- Keep `fg` and `fg_dim` clearly readable on `bg`. A contrast of at least
  4.5:1 is the reference for body text.
- `fg_bright` is also used as the background of focused links and of the
  selection, with `bg` as the text color. The two must contrast with each
  other.
- `alert` should stand out from both `fg` and `bg`.
- For light themes, start from `paper`: it already turns the halo off and
  softens the scanlines.

## Extra CSS

For anything that is not a color, point `extra_css` at files inside `docs/`.
They are loaded after the default style sheet.

```toml
extra_css = ["assets/custom.css"]
```

The font and the width of the text column are variables:

```css
:root {
  --font: "Fira Code", monospace;
  --measure: 100ch;
}
```

md-term loads no web fonts: the font must be installed on the visitor's
computer or declared with `@font-face` in your CSS.

Turning off the scanlines and the vignette:

```css
body::after {
  display: none;
}
```

Larger text:

```css
body {
  font-size: 17px;
}
```

To change colors in CSS instead of `[colors]`, use the same selector the
themes use, because a plain `:root` loses to it:

```css
:root[data-theme="amber"] {
  --alert: #ff3b3b;
}
```

## Replacing the CSS

For full control, put a modified copy of the style sheet at
`docs/assets/term.css`. The build uses it in place of the original. The cost
is that you stop receiving improvements to the default theme on every
update.

## Theme reference

| Variable | `phosphor` | `amber` | `ice` | `mono` | `dracula` | `paper` |
| --- | --- | --- | --- | --- | --- | --- |
| `--bg` | `#030b06` | `#0c0700` | `#030910` | `#0a0a0a` | `#282a36` | `#f4f1e8` |
| `--bg-raised` | `#08170d` | `#1a1003` | `#081624` | `#161616` | `#343746` | `#e9e5d8` |
| `--fg` | `#9be8ae` | `#f2c078` | `#a9d6f5` | `#d0d0d0` | `#f8f8f2` | `#2b2b26` |
| `--fg-bright` | `#4dff88` | `#ffb000` | `#5cc8ff` | `#ffffff` | `#bd93f9` | `#000000` |
| `--fg-dim` | `#4c9462` | `#a3742a` | `#4f86ad` | `#858585` | `#8b98c9` | `#6b6a60` |
| `--line` | `#17402a` | `#46300c` | `#173650` | `#333333` | `#44475a` | `#c9c4b3` |
| `--alert` | `#ffb454` | `#ff6b4a` | `#ffd166` | `#ffcc66` | `#ff79c6` | `#b3261e` |
