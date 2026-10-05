import json
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

from md_term.build import build, relurl
from md_term.config import Config, MdTermError, load_config
from md_term.content import parse_page

POST = """\
---
title: First post
date: 2026-01-02
tags: [Python, notes]
---
Intro paragraph with a [link](../guide/setup.md#install) and ![img](pic.png).

See [missing](nope.md).
"""


@pytest.fixture
def project(tmp_path: Path) -> Config:
    docs = tmp_path / "docs"
    (docs / "blog").mkdir(parents=True)
    (docs / "guide").mkdir()
    (docs / "index.md").write_text("# Home\n\nGo to the [blog](blog/first.md).\n")
    (docs / "blog" / "first.md").write_text(POST)
    (docs / "blog" / "pic.png").write_bytes(b"png")
    (docs / "blog" / "wip.md").write_text("---\ndraft: true\ndate: 2026-02-01\n---\nSecret.\n")
    (docs / "guide" / "setup.md").write_text("# Setup\n\n## Install\n\nRun it.\n")
    return Config(root=tmp_path, site_name="Test", site_url="https://example.com/sub")


def read(config: Config, path: str) -> str:
    return (config.site_path / path).read_text(encoding="utf-8")


def test_relurl():
    assert relurl("", "") == "./"
    assert relurl("", "a/b/") == "../../"
    assert relurl("a/b/", "a/b/") == "./"
    assert relurl("guide/setup/", "blog/first/") == "../../guide/setup/"
    assert relurl("blog/pic.png", "blog/first/") == "../pic.png"


def test_parse_page_front_matter_and_title():
    page = parse_page("blog/first.md", POST)
    assert (page.title, page.date.isoformat(), page.tags) == (
        "First post",
        "2026-01-02",
        ["Python", "notes"],
    )
    assert page.body_line == 6 and not page.has_heading
    assert page.url == "blog/first/"

    plain = parse_page("notes/my-note.md", "no heading here")
    assert plain.title == "my note" and plain.body_line == 1
    assert parse_page("guide/index.md", "# Guide\n").url == "guide/"
    assert parse_page("index.md", "").url == ""


def test_parse_page_rejects_bad_front_matter():
    with pytest.raises(MdTermError):
        parse_page("a.md", "---\ndate: someday\n---\n")
    with pytest.raises(MdTermError):
        parse_page("a.md", "---\n- just\n- a list\n---\n")


def test_build_pages_and_links(project: Config, caplog):
    build(project)
    post = read(project, "blog/first/index.html")
    assert 'href="../../guide/setup/#install"' in post
    assert 'src="../pic.png"' in post
    assert 'href="../../assets/term.css"' in post
    assert 'data-base="../../"' in post and 'data-cwd="/blog"' in post
    assert "<h1>First post</h1>" in post
    assert "broken link to 'nope.md'" in caplog.text

    home = read(project, "index.html")
    assert 'href="blog/first/"' in home and 'data-base="./"' in home
    assert (project.site_path / "blog" / "pic.png").read_bytes() == b"png"
    # directories without an index.md get a generated listing
    assert 'data-path="/blog/first.md"' in read(project, "blog/index.html")


def test_drafts_are_opt_in(project: Config):
    build(project)
    assert not (project.site_path / "blog" / "wip").exists()
    assert "/blog/wip.md" not in json.loads(read(project, "fs.json"))["nodes"]
    build(project, drafts=True)
    assert (project.site_path / "blog" / "wip" / "index.html").exists()


def test_fs_search_and_tags(project: Config):
    build(project)
    fs = json.loads(read(project, "fs.json"))
    assert fs["nodes"]["/"]["children"] == ["blog", "guide", "index.md"]
    assert fs["nodes"]["/blog/first.md"] == {
        "type": "file",
        "url": "blog/first/",
        "title": "First post",
        "date": "2026-01-02",
        "tags": ["Python", "notes"],
    }
    assert fs["tags"]["Python"] == {"url": "tags/python/", "count": 1}
    assert "First post" in read(project, "tags/python/index.html")

    search = {doc["path"]: doc for doc in json.loads(read(project, "search.json"))}
    assert search["/blog/first.md"]["line"] == 6
    assert search["/blog/first.md"]["text"].startswith("Intro paragraph")


def test_feed(project: Config):
    build(project)
    channel = ET.fromstring(read(project, "feed.xml")).find("channel")
    items = channel.findall("item")
    assert [item.findtext("title") for item in items] == ["First post"]
    assert items[0].findtext("link") == "https://example.com/sub/blog/first/"
    assert items[0].findtext("description").startswith("Intro paragraph with a link")


def test_no_feed_without_site_url(project: Config):
    project.site_url = ""
    build(project)
    assert not (project.site_path / "feed.xml").exists()


def test_refuses_to_wipe_foreign_directory(project: Config):
    project.site_path.mkdir()
    (project.site_path / "precious.txt").write_text("keep me")
    with pytest.raises(MdTermError, match="refusing to overwrite"):
        build(project)
    assert (project.site_path / "precious.txt").exists()


def test_url_conflicts_and_reserved_paths(project: Config):
    (project.docs_path / "guide.md").write_text("# clash")
    (project.docs_path / "guide" / "index.md").write_text("# clash")
    with pytest.raises(MdTermError, match="both map to"):
        build(project)
    (project.docs_path / "guide.md").unlink()
    (project.docs_path / "tags").mkdir()
    (project.docs_path / "tags" / "x.md").write_text("x")
    with pytest.raises(MdTermError, match="reserved"):
        build(project)


def test_load_config(tmp_path: Path):
    path = tmp_path / "md-term.toml"
    path.write_text('site_name = "My Site"\nsite_url = "https://x.dev"\n')
    config = load_config(path)
    assert (config.host, config.site_url, config.root) == ("my-site", "https://x.dev/", tmp_path)
    path.write_text("nope = 1\n")
    with pytest.raises(MdTermError, match="unknown option"):
        load_config(path)
