from __future__ import annotations

import html
import logging
from collections.abc import Callable

from latex2mathml.converter import convert as latex_to_mathml
from markdown_it import MarkdownIt
from markdown_it.rules_core import StateCore
from mdit_py_plugins.admon import admon_plugin
from mdit_py_plugins.anchors import anchors_plugin
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


def _math(tex: str, options: dict) -> str:
    """Renders LaTeX to MathML at build time, so formulas need no JavaScript."""
    display = "block" if options.get("display_mode") else "inline"
    try:
        return latex_to_mathml(tex, display=display)
    except Exception as exc:  # noqa: BLE001 - the converter raises many unrelated types
        log.warning("could not render formula %r: %s", tex.strip(), type(exc).__name__)
        return f'<code class="math-error">{html.escape(tex)}</code>'


def make_renderer() -> MarkdownIt:
    md = MarkdownIt("commonmark", {"html": True, "alerts": True, "highlight": _highlight})
    md.enable(["table", "strikethrough"])
    md.use(footnote_plugin)
    md.use(deflist_plugin)
    md.use(admon_plugin)
    # No spaces or digits next to the dollars, so prices like $5 stay text.
    md.use(dollarmath_plugin, allow_space=False, allow_digits=False, renderer=_math)
    md.use(anchors_plugin, max_level=4)
    md.use(tasklists_plugin)
    md.core.ruler.push("md_term_links", _rewrite_links)
    return md


def render(md: MarkdownIt, text: str, resolve_link: LinkResolver | None = None) -> str:
    return md.render(text, {"resolve_link": resolve_link})
