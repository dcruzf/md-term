import hashlib
import io
import json
import tarfile
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

from md_term import python_runtime
from md_term.build import build, relurl
from md_term.config import THEMES, Config, MdTermError, load_config
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


def test_every_theme_is_defined_in_the_stylesheet():
    css = (Path(__file__).parent.parent / "src/md_term/assets/term.css").read_text()
    for theme in THEMES[1:]:
        assert f':root[data-theme="{theme}"]' in css


def test_theme_colors_and_extra_css(project: Config, caplog):
    (project.docs_path / "custom.css").write_text("body { font-size: 17px; }")
    project.theme = "amber"
    project.colors = {"fg_bright": "#00ff9c", "glow": "transparent"}
    project.extra_css = ["custom.css", "missing.css"]
    build(project)
    post = read(project, "blog/first/index.html")
    assert 'data-theme="amber"' in post and f'data-themes="{" ".join(THEMES)}"' in post
    assert ':root[data-theme="amber"] {' in post
    assert "--fg-bright: #00ff9c;" in post and "--glow: transparent;" in post
    assert 'href="../../custom.css"' in post
    assert "extra_css: 'missing.css' not found" in caplog.text


def test_config_rejects_bad_theme_and_colors(tmp_path: Path):
    path = tmp_path / "md-term.toml"
    for text, message in [
        ('theme = "neon"', "unknown theme"),
        ('[colors]\nlink = "#fff"', "unknown color"),
        ('[colors]\nbg = "red; } body { display: none"', "not a valid CSS color"),
        ('colors = "#fff"', "must be a table"),
        ('extra_css = "a.css"', "must be a list"),
    ]:
        path.write_text(text + "\n")
        with pytest.raises(MdTermError, match=message):
            load_config(path)
    path.write_text('theme = "ice"\n[colors]\nbg = "rgb(0 10 20 / 90%)"\n')
    assert load_config(path).colors == {"bg": "rgb(0 10 20 / 90%)"}


@pytest.fixture
def fake_runtime(tmp_path: Path, monkeypatch):
    """A tiny stand-in for the Monty tarball, served from a file:// URL."""
    payload = {"core.wasm": b"\0asm-core", "core2.wasm": b"\0asm-two"}
    archive = tmp_path / "runtime.tgz"
    with tarfile.open(archive, "w:gz") as tar:
        for name, data in payload.items():
            info = tarfile.TarInfo(f"package/dist/{name}")
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    spec = python_runtime.load_spec() | {
        "tarball": archive.as_uri(),
        "files": {
            name: {
                "member": f"package/dist/{name}",
                "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
            for name, data in payload.items()
        },
    }
    monkeypatch.setattr(python_runtime, "load_spec", lambda: spec)
    monkeypatch.setenv("MD_TERM_CACHE", str(tmp_path / "cache"))
    return spec, archive


def test_python_is_off_by_default(project: Config):
    build(project)
    assert not (project.site_path / "assets" / "python").exists()
    assert "data-python" not in read(project, "index.html")


def test_python_runtime_is_installed_and_cached(project: Config, fake_runtime):
    _, archive = fake_runtime
    project.python = True
    build(project)
    target = project.site_path / "assets" / "python"
    manifest = json.loads((target / "manifest.json").read_text())
    assert manifest["runtime"] == "monty" and manifest["glue"] == "monty.js"
    assert manifest["files"] == {"core.wasm": 9, "core2.wasm": 8}
    assert (target / "core.wasm").read_bytes() == b"\0asm-core"
    assert (target / "monty.js").stat().st_size > 1000
    assert (target / "monty.worker.js").exists()
    assert 'data-python="assets/python/"' in read(project, "blog/first/index.html")

    archive.unlink()  # a second build must be served from the cache, offline
    build(project)
    assert (project.site_path / "assets" / "python" / "core2.wasm").exists()


def test_python_runtime_rejects_tampered_download(project: Config, fake_runtime):
    spec, _ = fake_runtime
    spec["files"]["core.wasm"]["sha256"] = "0" * 64
    project.python = True
    with pytest.raises(MdTermError, match="checksum mismatch for core.wasm"):
        build(project)


def test_python_runtime_download_failure(project: Config, fake_runtime):
    _, archive = fake_runtime
    archive.unlink()
    project.python = True
    with pytest.raises(MdTermError, match="could not download the Python runtime"):
        build(project)


def test_vendored_runtime_spec_is_consistent():
    spec = python_runtime.load_spec()
    assert spec["tarball"].endswith(f"monty-{spec['version']}.tgz")
    for name in spec["glue"]:
        assert (Path(python_runtime.__file__).parent / "runtimes" / "monty" / name).is_file()
    assert all(len(info["sha256"]) == 64 for info in spec["files"].values())


def test_custom_ps1(project: Config):
    project.ps1 = "[{host}] {dir} λ"
    assert project.prompt("/") == "[test] ~ λ"
    assert project.prompt("/guide/deep") == "[test] deep λ"
    build(project)
    post = read(project, "blog/first/index.html")
    assert '<span class="ps1">[test] blog λ</span>' in post
    assert 'data-ps1="[{host}] {dir} λ"' in post
    assert Config(root=project.root).prompt("/blog") == "guest@md-term:~/blog$"


def test_ps1_rejects_unknown_placeholders(tmp_path: Path):
    path = tmp_path / "md-term.toml"
    for text, message in [
        ('ps1 = "{date} $"', "unknown placeholder '{date}'"),
        ('ps1 = " "', "must not be empty"),
    ]:
        path.write_text(text + "\n")
        with pytest.raises(MdTermError, match=message):
            load_config(path)
