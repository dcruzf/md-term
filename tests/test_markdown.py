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
