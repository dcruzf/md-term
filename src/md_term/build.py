from __future__ import annotations

import datetime as dt
import html
import json
import logging
import posixpath
import re
import shutil
from email.utils import format_datetime
from importlib import resources
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit

from jinja2 import Environment, PackageLoader, select_autoescape

from .config import THEMES, Config, MdTermError
from .content import Page, Site, load_site
from .markdown import make_renderer, render

log = logging.getLogger("md_term")

MARKER = ".md-term-build"
FEED_ITEMS = 20


def relurl(target: str, from_dir: str) -> str:
    """Relative URL from the directory URL `from_dir` to the site-relative `target`."""
    rel = posixpath.relpath(target or ".", from_dir or ".")
    if target == "" or target.endswith("/"):
        return "./" if rel == "." else rel + "/"
    return rel


def display_path(vdir: str) -> str:
    return "~" if vdir == "/" else "~" + vdir


def build(config: Config, *, drafts: bool = False, livereload: bool = False) -> Site:
    site = load_site(config, drafts=drafts)
    out = config.site_path
    _prepare_output(config)

    for css in config.extra_css:
        if css not in site.static:
            log.warning("extra_css: '%s' not found in %s", css, config.docs_dir)

    md = make_renderer()
    for page in site.pages:
        page.html = render(md, page.body, _link_resolver(page, site))
        page.excerpt = page.description or _excerpt(page.html)

    env = Environment(
        loader=PackageLoader("md_term"),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    has_feed = bool(config.site_url and site.posts)
    if site.posts and not config.site_url:
        log.warning("site_url is not set: skipping feed.xml")

    def write_html(url: str, template: str, **context: object) -> None:
        base = relurl("", url)
        text = env.get_template(template).render(
            config=config,
            themes=THEMES,
            colors={key.replace("_", "-"): value for key, value in config.colors.items()},
            base=base,
            has_feed=has_feed,
            livereload=livereload,
            href=lambda target: relurl(target, url),
            **context,
        )
        _write(out / url / "index.html", text)

    for page in site.pages:
        write_html(
            page.url,
            "page.html",
            page=page,
            title=page.title,
            description=page.excerpt,
            cwd=page.vdir,
            ps1=_ps1(config, page.vdir),
            command=f"cat {page.name}",
            tags=[site.tags[slug] for slug in site.tags if page in site.tags[slug].pages],
            motd=config.motd if page.url == "" else "",
        )

    page_urls = {page.url for page in site.pages}
    for directory in sorted(site.dirs):
        url = f"{directory}/" if directory else ""
        if url in page_urls:
            continue
        vdir = "/" + directory
        write_html(
            url,
            "listing.html",
            title=posixpath.basename(directory) or config.site_name,
            description=config.description,
            cwd=vdir,
            ps1=_ps1(config, vdir),
            command="ls",
            entries=_dir_entries(site, directory),
            motd=config.motd if url == "" else "",
        )

    write_html(
        "tags/",
        "listing.html",
        title="tags",
        description="",
        cwd="/",
        ps1=_ps1(config, "/"),
        command="tags",
        entries=[
            {
                "label": f"#{tag.name}",
                "url": tag.url,
                "cmd": f"tag {_quote(tag.name)}",
                "kind": "tag",
                "meta": f"({len(tag.pages)})",
            }
            for tag in site.tags.values()
        ],
        motd="",
    )
    for tag in site.tags.values():
        write_html(
            tag.url,
            "listing.html",
            title=f"#{tag.name}",
            description="",
            cwd="/",
            ps1=_ps1(config, "/"),
            command=f"tag {_quote(tag.name)}",
            entries=[_file_entry(p, label=p.vpath) for p in _by_date(tag.pages)],
            motd="",
        )

    _write(out / "fs.json", json.dumps(_fs(site), ensure_ascii=False, separators=(",", ":")))
    _write(
        out / "search.json", json.dumps(_search(site), ensure_ascii=False, separators=(",", ":"))
    )
    if has_feed:
        _write(out / "feed.xml", _feed(env, config, site))

    _copy_assets(out / "assets")
    for src in site.static:
        target = out / src
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(config.docs_path / src, target)

    return site


def _prepare_output(config: Config) -> None:
    out, docs, root = config.site_path, config.docs_path, config.root.resolve()
    if out == docs or out in docs.parents or out == root or out in root.parents:
        raise MdTermError(f"site_dir must not contain the project or the docs: {out}")
    if docs in out.parents:
        raise MdTermError(f"site_dir must not be inside docs_dir: {out}")
    if out.exists():
        if not out.is_dir():
            raise MdTermError(f"site_dir is not a directory: {out}")
        if any(out.iterdir()) and not (out / MARKER).exists():
            raise MdTermError(
                f"refusing to overwrite {out}: it is not empty and was not created by md-term"
            )
        shutil.rmtree(out)
    out.mkdir(parents=True)
    (out / MARKER).write_text("Generated by md-term. This directory is wiped on every build.\n")


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _copy_assets(target: Path) -> None:
    source = resources.files("md_term") / "assets"
    with resources.as_file(source) as path:
        shutil.copytree(path, target, dirs_exist_ok=True)


def _ps1(config: Config, vdir: str) -> str:
    return f"{config.user}@{config.host}:{display_path(vdir)}$"


def _quote(arg: str) -> str:
    return f'"{arg}"' if re.search(r"\s", arg) else arg


def _by_date(pages: list[Page]) -> list[Page]:
    dated = sorted((p for p in pages if p.date), key=lambda p: (p.date, p.src), reverse=True)
    return dated + sorted((p for p in pages if not p.date), key=lambda p: p.src)


def _link_resolver(page: Page, site: Site):
    def resolve(href: str) -> str:
        parts = urlsplit(href)
        if parts.scheme or parts.netloc or not parts.path or parts.path.startswith("/"):
            return href
        target = posixpath.normpath(posixpath.join(page.dir, unquote(parts.path)))
        if target.startswith(".."):
            return href
        if target in site.by_src:
            url = site.by_src[target].url
        elif target.lower().endswith(".md"):
            log.warning("%s: broken link to '%s'", page.src, href)
            return href
        elif target in site.dirs or target == ".":
            url = "" if target == "." else target + "/"
        else:
            url = target
        return urlunsplit(("", "", quote(relurl(url, page.url)), parts.query, parts.fragment))

    return resolve


def _excerpt(page_html: str, limit: int = 240) -> str:
    match = re.search(r"<p>(.*?)</p>", page_html, re.DOTALL)
    if not match:
        return ""
    text = " ".join(html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _children(site: Site, directory: str) -> tuple[list[str], list[Page]]:
    subdirs = sorted(d for d in site.dirs if d and posixpath.dirname(d) == directory)
    files = sorted((p for p in site.pages if p.dir == directory), key=lambda p: p.name)
    return subdirs, files


def _file_entry(page: Page, label: str | None = None) -> dict:
    meta = " ".join(filter(None, [page.date.isoformat() if page.date else "", page.title]))
    return {
        "label": label or page.name,
        "url": page.url,
        "path": page.vpath,
        "kind": "file",
        "meta": meta,
    }


def _dir_entries(site: Site, directory: str) -> list[dict]:
    entries = []
    if directory:
        parent = posixpath.dirname(directory)
        entries.append(
            {
                "label": "../",
                "url": f"{parent}/" if parent else "",
                "path": "/" + parent,
                "kind": "dir",
                "meta": "",
            }
        )
    subdirs, files = _children(site, directory)
    for sub in subdirs:
        entries.append(
            {
                "label": posixpath.basename(sub) + "/",
                "url": sub + "/",
                "path": "/" + sub,
                "kind": "dir",
                "meta": "",
            }
        )
    entries.extend(_file_entry(page) for page in files)
    return entries


def _fs(site: Site) -> dict:
    nodes: dict[str, dict] = {}
    for directory in sorted(site.dirs):
        subdirs, files = _children(site, directory)
        nodes["/" + directory] = {
            "type": "dir",
            "url": f"{directory}/" if directory else "",
            "children": [posixpath.basename(d) for d in subdirs] + [p.name for p in files],
        }
    for page in site.pages:
        node: dict = {"type": "file", "url": page.url, "title": page.title}
        if page.date:
            node["date"] = page.date.isoformat()
        if page.tags:
            node["tags"] = page.tags
        if page.draft:
            node["draft"] = True
        nodes[page.vpath] = node
    tags = {t.name: {"url": t.url, "count": len(t.pages)} for t in site.tags.values()}
    return {"nodes": nodes, "tags": tags}


def _search(site: Site) -> list[dict]:
    return [{"path": p.vpath, "line": p.body_line, "text": p.body.rstrip()} for p in site.pages]


def _feed(env: Environment, config: Config, site: Site) -> str:
    def rfc822(day: dt.date) -> str:
        return format_datetime(dt.datetime(day.year, day.month, day.day, tzinfo=dt.UTC))

    posts = site.posts[:FEED_ITEMS]
    return env.get_template("feed.xml").render(
        config=config,
        posts=[
            {
                "title": p.title,
                "link": config.site_url + quote(p.url),
                "date": rfc822(p.date),
                "description": p.excerpt,
                "tags": p.tags,
            }
            for p in posts
        ],
        updated=rfc822(posts[0].date),
    )
