from __future__ import annotations

import html
import logging
import posixpath
import re
from collections.abc import Callable

from latex2mathml.converter import convert as latex_to_mathml
from markdown_it import MarkdownIt
from markdown_it.renderer import RendererHTML
from markdown_it.rules_core import StateCore
from markdown_it.rules_inline import StateInline
from markdown_it.token import Token
from mdit_py_plugins.admon import admon_plugin
from mdit_py_plugins.anchors import anchors_plugin
from mdit_py_plugins.anchors.index import slugify as heading_slug
from mdit_py_plugins.deflist import deflist_plugin
from mdit_py_plugins.dollarmath import dollarmath_plugin
from mdit_py_plugins.footnote import footnote_plugin
from mdit_py_plugins.tasklists import tasklists_plugin
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import TextLexer, get_lexer_by_name
from pygments.util import ClassNotFound

log = logging.getLogger("md_term")

LinkResolver = Callable[[str], str]
# Maps the target of a [[wikilink]] to a URL relative to the page, or None.
WikilinkResolver = Callable[[str], str | None]

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".bmp"}
CALLOUT = re.compile(r"\[!(\w+)\]([+-]?)[ \t]*(.*)")


def _highlight(code: str, lang: str, attrs: str) -> str:
    if lang == "mermaid":
        # Drawn in the browser (assets/js/diagrams.js); without JavaScript the
        # source stays readable as a plain block.
        return f'<pre class="mermaid">{html.escape(code)}</pre>\n'
    try:
        lexer = get_lexer_by_name(lang) if lang else TextLexer()
    except ClassNotFound:
        lexer = TextLexer()
    # nowrap: markdown-it adds the surrounding <pre><code class="language-x">.
    return highlight(code, lexer, HtmlFormatter(nowrap=True))


def _rewrite_links(state: StateCore) -> None:
    resolve: LinkResolver | None = state.env.get("resolve_link")
    if resolve is None:
        return
    for token in state.tokens:
        for child in token.children or []:
            attr = {"link_open": "href", "image": "src"}.get(child.type)
            if attr and isinstance(child.attrGet(attr), str):
                child.attrSet(attr, resolve(child.attrGet(attr)))


def _callouts(state: StateCore) -> None:
    """Turns `> [!type] Title` quotes into alerts: GitHub's five and Obsidian's callouts.

    Runs before inline parsing, so the title and body still get parsed as markdown.
    A trailing `-` or `+` (Obsidian's foldable callouts) produces <details>.
    """
    tokens = state.tokens
    index = 0
    while index < len(tokens) - 2:
        opener, first = tokens[index], tokens[index + 2]
        index += 1
        if opener.type != "blockquote_open" or first.type != "inline":
            continue
        head, _, rest = first.content.partition("\n")
        match = CALLOUT.fullmatch(head.strip())
        if not match:
            continue
        kind, fold, title = match.group(1).lower(), match.group(2), match.group(3)

        depth = 0
        for closer in tokens[index:]:
            depth += closer.type == "blockquote_open"
            if closer.type == "blockquote_close":
                if depth == 0:
                    break
                depth -= 1
        tag, title_tag = ("details", "summary") if fold else ("div", "p")
        opener.tag = closer.tag = tag
        opener.attrSet("class", f"markdown-alert markdown-alert-{kind}")
        if fold == "+":
            opener.attrSet("open", "")

        title_open = Token("paragraph_open", title_tag, 1, block=True, level=opener.level + 1)
        title_open.attrSet("class", "markdown-alert-title")
        title_text = Token("inline", "", 0, content=title or kind.capitalize(), children=[])
        title_text.level = opener.level + 2
        title_close = Token("paragraph_close", title_tag, -1, block=True, level=opener.level + 1)
        if rest.strip():
            first.content = rest
            tokens[index:index] = [title_open, title_text, title_close]
        else:  # the marker was the whole first paragraph: the title replaces it
            tokens[index : index + 3] = [title_open, title_text, title_close]


def _wikilink(state: StateInline, silent: bool) -> bool:
    """Parses Obsidian's `[[note]]`, `[[note#heading|label]]` and `![[image.png|300]]`."""
    embed = state.src.startswith("![[", state.pos)
    if not embed and not state.src.startswith("[[", state.pos):
        return False
    start = state.pos + (3 if embed else 2)
    end = state.src.find("]]", start)
    inner = state.src[start:end] if end != -1 else ""
    if not inner.strip() or "\n" in inner or "[" in inner:
        return False
    if not silent:
        target, _, label = inner.partition("|")
        target, _, heading = target.partition("#")
        token = state.push("wikilink", "", 0)
        token.meta = {
            "target": target.strip(),
            "heading": heading.strip(),
            "label": label.strip(),
            "embed": embed,
        }
    state.pos = end + 2
    return True


def _render_wikilink(renderer: RendererHTML, tokens, idx, options, env) -> str:
    meta = tokens[idx].meta
    target, heading, label = meta["target"], meta["heading"], meta["label"]
    resolve: WikilinkResolver | None = env.get("resolve_wikilink")
    url = "" if not target else (resolve(target) if resolve else None)
    name = posixpath.basename(target)
    text = label or " > ".join(filter(None, [name, heading]))
    if url is None:
        return f'<span class="broken-link" title="Note not found">{html.escape(text)}</span>'
    if meta["embed"] and posixpath.splitext(target)[1].lower() in IMAGE_SUFFIXES:
        width = f' width="{label}"' if label.isdigit() else ""
        alt = html.escape(name if label.isdigit() or not label else label)
        return f'<img src="{html.escape(url)}" alt="{alt}"{width}>'
    if heading:
        url += "#" + heading_slug(heading)
    return f'<a href="{html.escape(url)}">{html.escape(text)}</a>'


def _math(tex: str, options: dict) -> str:
    """Renders LaTeX to MathML at build time, so formulas need no JavaScript."""
    display = "block" if options.get("display_mode") else "inline"
    try:
        return latex_to_mathml(tex, display=display)
    except Exception as exc:  # noqa: BLE001 - the converter raises many unrelated types
        log.warning("could not render formula %r: %s", tex.strip(), type(exc).__name__)
        return f'<code class="math-error">{html.escape(tex)}</code>'


def make_renderer() -> MarkdownIt:
    md = MarkdownIt("commonmark", {"html": True, "highlight": _highlight})
    md.enable(["table", "strikethrough"])
    md.use(footnote_plugin)
    md.use(deflist_plugin)
    md.use(admon_plugin)
    # No spaces or digits next to the dollars, so prices like $5 stay text.
    md.use(dollarmath_plugin, allow_space=False, allow_digits=False, renderer=_math)
    md.use(anchors_plugin, max_level=4)
    md.use(tasklists_plugin)
    md.core.ruler.before("inline", "md_term_callouts", _callouts)
    md.inline.ruler.before("link", "wikilink", _wikilink)
    md.add_render_rule("wikilink", _render_wikilink)
    md.core.ruler.push("md_term_links", _rewrite_links)
    return md


def render(
    md: MarkdownIt,
    text: str,
    resolve_link: LinkResolver | None = None,
    resolve_wikilink: WikilinkResolver | None = None,
) -> str:
    return md.render(text, {"resolve_link": resolve_link, "resolve_wikilink": resolve_wikilink})
