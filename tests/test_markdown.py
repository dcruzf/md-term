import logging

from md_term.markdown import make_renderer, render


def html(text: str) -> str:
    return render(make_renderer(), text)


def test_github_alerts():
    out = html("> [!WARNING]\n> Careful **now**.\n")
    assert '<div class="markdown-alert markdown-alert-warning">' in out
    assert '<p class="markdown-alert-title">Warning</p>' in out
    assert "<strong>now</strong>" in out
    assert "<blockquote>" in html("> a plain quote\n")


def test_admonitions_with_custom_title():
    out = html('!!! tip "Pro tip"\n    Indented body.\n')
    assert '<div class="admonition tip">' in out
    assert '<p class="admonition-title">Pro tip</p>' in out


def test_inline_and_block_math_become_mathml():
    out = html("Euler: $e^{i\\pi} + 1 = 0$.\n\n$$\n\\frac{1}{2}\n$$\n")
    assert out.count("<math") == 2
    assert 'display="inline"' in out and 'display="block"' in out
    assert "<mfrac>" in out and "$" not in out


def test_prices_are_not_math():
    out = html("It costs $5 or $10, not $ 3 $.\n")
    assert "<math" not in out and "$5 or $10" in out


def test_broken_formula_is_shown_and_reported(caplog):
    with caplog.at_level(logging.WARNING, logger="md_term"):
        out = html("$\\frac{1}{$\n")
    assert '<code class="math-error">\\frac{1}{</code>' in out
    assert "could not render formula" in caplog.text


def test_mermaid_blocks_keep_their_source_for_the_browser():
    out = html("```mermaid\nflowchart LR\n    A --> B\n```\n")
    assert '<pre class="mermaid">flowchart LR\n    A --&gt; B\n</pre>' in out
    assert "<code" not in out


def test_definition_lists_footnotes_and_tasks():
    out = html("Term\n: Definition\n\nNote[^1].\n\n[^1]: Text.\n\n- [x] done\n")
    assert "<dt>Term</dt>" in out and "<dd>Definition</dd>" in out
    assert 'class="footnote-ref"' in out
    assert 'class="task-list-item' in out


def test_code_is_highlighted_at_build_time():
    out = html("```python\ndef f():\n    pass\n```\n")
    assert '<code class="language-python">' in out and '<span class="k">def</span>' in out


def test_obsidian_callouts_with_title_and_any_type():
    out = html("> [!question] Is it **true**?\n> Yes.\n")
    assert '<div class="markdown-alert markdown-alert-question">' in out
    assert '<p class="markdown-alert-title">Is it <strong>true</strong>?</p>' in out
    assert "<p>Yes.</p>" in out and "[!question]" not in out
    title_only = html("> [!bug]\n")
    assert '<p class="markdown-alert-title">Bug</p>' in title_only and "<p></p>" not in title_only


def test_foldable_callouts_become_details():
    closed = html("> [!note]- Hidden\n> Body\n")
    assert '<details class="markdown-alert markdown-alert-note">' in closed
    assert '<summary class="markdown-alert-title">Hidden</summary>' in closed
    assert "</details>" in closed and " open" not in closed
    assert '<details class="markdown-alert markdown-alert-tip" open="">' in html(
        "> [!tip]+ Shown\n> Body\n"
    )


def test_nested_quote_inside_a_callout():
    out = html("> [!note]\n> Outer\n>\n> > inner quote\n\nAfter\n")
    assert out.count("<blockquote>") == 1 and out.rstrip().endswith("<p>After</p>")
    assert out.index("</blockquote>") < out.index("</div>")


def wiki(text: str, known: dict[str, str]) -> str:
    return render(make_renderer(), text, resolve_wikilink=known.get)


def test_wikilinks():
    known = {"Other Note": "../other-note/", "folder/deep": "../folder/deep/"}
    assert '<a href="../other-note/">Other Note</a>' in wiki("See [[Other Note]].", known)
    assert '<a href="../other-note/">that one</a>' in wiki("See [[Other Note|that one]].", known)
    out = wiki("See [[Other Note#Some Heading]].", known)
    assert '<a href="../other-note/#some-heading">Other Note &gt; Some Heading</a>' in out
    assert '<a href="../folder/deep/">deep</a>' in wiki("[[folder/deep]]", known)
    assert '<a href="#local-part">Local Part</a>' in wiki("[[#Local Part]]", known)


def test_broken_wikilink_is_marked_not_linked():
    out = wiki("See [[Missing]].", {})
    assert (
        '<span class="broken-link" title="Note not found">Missing</span>' in out and "<a" not in out
    )


def test_embeds():
    known = {"pic.png": "../pic.png", "Note": "../note/"}
    assert '<img src="../pic.png" alt="pic.png">' in wiki("![[pic.png]]", known)
    assert '<img src="../pic.png" alt="pic.png" width="300">' in wiki("![[pic.png|300]]", known)
    assert '<img src="../pic.png" alt="A cat">' in wiki("![[pic.png|A cat]]", known)
    assert '<a href="../note/">Note</a>' in wiki("![[Note]]", known)  # no transclusion


def test_wikilink_syntax_is_left_alone_in_code_and_normal_links():
    assert "<code>[[not a link]]</code>" in wiki("`[[not a link]]`", {})
    assert '<a href="x.md">text</a>' in wiki("[text](x.md)", {})
