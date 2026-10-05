from __future__ import annotations

from collections.abc import Callable

from markdown_it import MarkdownIt
from markdown_it.rules_core import StateCore
from mdit_py_plugins.anchors import anchors_plugin
from mdit_py_plugins.footnote import footnote_plugin
from mdit_py_plugins.tasklists import tasklists_plugin
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import TextLexer, get_lexer_by_name
from pygments.util import ClassNotFound

LinkResolver = Callable[[str], str]


def _highlight(code: str, lang: str, attrs: str) -> str:
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


def make_renderer() -> MarkdownIt:
    md = MarkdownIt("commonmark", {"html": True, "highlight": _highlight})
    md.enable(["table", "strikethrough"])
    md.use(footnote_plugin)
    md.use(anchors_plugin, max_level=4)
    md.use(tasklists_plugin)
    md.core.ruler.push("md_term_links", _rewrite_links)
    return md


def render(md: MarkdownIt, text: str, resolve_link: LinkResolver | None = None) -> str:
    return md.render(text, {"resolve_link": resolve_link})
