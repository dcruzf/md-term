from __future__ import annotations

import datetime as dt
import posixpath
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .config import Config, MdTermError

FRONT_MATTER = re.compile(r"\A---[ \t]*\r?\n(.*?\r?\n)??---[ \t]*(\r?\n|\Z)", re.DOTALL)
FIRST_HEADING = re.compile(r"\A\s*#[ \t]+(.+?)[ \t#]*$", re.MULTILINE)

FENCE = re.compile(r"^(```|~~~).*?^\1[ \t]*$", re.MULTILINE | re.DOTALL)
COMMENT = re.compile(r"%%.*?%%", re.DOTALL)

# Paths the build writes itself; docs must not produce them.
RESERVED_FILES = {"fs.json", "search.json", "feed.xml"}
RESERVED_DIRS = {"tags"}


@dataclass
class Page:
    src: str  # posix path relative to docs_dir, e.g. "blog/hello.md"
    title: str
    body: str
    body_line: int  # 1-based line of the source file where the body starts
    has_heading: bool
    date: dt.date | None = None
    tags: list[str] = field(default_factory=list)
    description: str = ""
    draft: bool = False
    meta: dict = field(default_factory=dict)  # the raw front matter
    html: str = ""
    excerpt: str = ""

    @property
    def name(self) -> str:
        return posixpath.basename(self.src)

    @property
    def dir(self) -> str:
        """Parent directory relative to the docs root ('' for the root)."""
        return posixpath.dirname(self.src)

    @property
    def url(self) -> str:
        """Site-relative directory URL: '' for the root index, else 'a/b/'."""
        stem = self.src[: -len(".md")]
        if posixpath.basename(stem) == "index":
            stem = posixpath.dirname(stem)
        return f"{stem}/" if stem else ""

    @property
    def vpath(self) -> str:
        return "/" + self.src

    @property
    def vdir(self) -> str:
        return "/" + self.dir


@dataclass
class Tag:
    name: str
    slug: str
    pages: list[Page] = field(default_factory=list)

    @property
    def url(self) -> str:
        return f"tags/{self.slug}/"


@dataclass
class Site:
    pages: list[Page]
    static: list[str]  # non-markdown files, relative to docs_dir
    by_src: dict[str, Page]
    dirs: set[str]  # every directory holding content, '' is the root
    tags: dict[str, Tag]  # keyed by slug

    @property
    def posts(self) -> list[Page]:
        dated = [p for p in self.pages if p.date]
        return sorted(dated, key=lambda p: (p.date, p.src), reverse=True)


def slugify(text: str) -> str:
    return re.sub(r"[^\w]+", "-", text.lower()).strip("-") or "tag"


def _parse_date(value: object, src: str) -> dt.date | None:
    if value is None:
        return None
    if isinstance(value, dt.datetime):
        return value.date()
    if isinstance(value, dt.date):
        return value
    try:
        return dt.date.fromisoformat(str(value)[:10])
    except ValueError:
        raise MdTermError(f"{src}: invalid date {value!r} (use YYYY-MM-DD)")


def _parse_tags(value: object, src: str) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        value = value.split(",")
    if not isinstance(value, list):
        raise MdTermError(f"{src}: 'tags' must be a list or a comma-separated string")
    return [tag for tag in (str(v).strip() for v in value) if tag]


def strip_comments(text: str) -> str:
    """Removes Obsidian's `%%private comments%%`, leaving fenced code alone."""
    out, last = [], 0
    for fence in FENCE.finditer(text):
        out += [COMMENT.sub("", text[last : fence.start()]), fence.group(0)]
        last = fence.end()
    out.append(COMMENT.sub("", text[last:]))
    return "".join(out)


def parse_page(src: str, text: str) -> Page:
    meta: dict = {}
    body, body_line = text, 1
    match = FRONT_MATTER.match(text)
    if match:
        try:
            meta = yaml.safe_load(match.group(1) or "") or {}
        except yaml.YAMLError as exc:
            raise MdTermError(f"{src}: invalid front matter: {exc}")
        if not isinstance(meta, dict):
            raise MdTermError(f"{src}: front matter must be a mapping")
        body = text[match.end() :]
        body_line = match.group(0).count("\n") + 1
    if "%%" in body:
        body = strip_comments(body)

    heading = FIRST_HEADING.match(body)
    title = meta.get("title") or (heading.group(1) if heading else None)
    if not title:
        stem = posixpath.basename(src)[: -len(".md")]
        if stem == "index":
            stem = posixpath.basename(posixpath.dirname(src)) or "index"
        title = stem.replace("-", " ").replace("_", " ")

    return Page(
        src=src,
        title=str(title),
        body=body,
        body_line=body_line,
        has_heading=heading is not None,
        date=_parse_date(meta.get("date"), src),
        tags=_parse_tags(meta.get("tags"), src),
        description=str(meta.get("description") or ""),
        # `publish: false` is how Obsidian marks a note as private.
        draft=bool(meta.get("draft", False)) or meta.get("publish") is False,
        meta=meta,
    )


def _parents(path: str) -> list[str]:
    out = [""]
    parts = path.split("/")[:-1]
    for i in range(len(parts)):
        out.append("/".join(parts[: i + 1]))
    return out


def load_site(config: Config, *, drafts: bool = False) -> Site:
    docs = config.docs_path
    if not docs.is_dir():
        raise MdTermError(f"docs directory not found: {docs}")

    pages: list[Page] = []
    static: list[str] = []
    for path in sorted(docs.rglob("*")):
        rel = path.relative_to(docs)
        if not path.is_file() or any(part.startswith(".") for part in rel.parts):
            continue
        src = rel.as_posix()
        if path.suffix.lower() == ".md":
            page = parse_page(src, _read(path))
            if drafts or not page.draft:
                pages.append(page)
        else:
            static.append(src)

    _check_conflicts(pages, static)

    dirs: set[str] = set()
    for page in pages:
        dirs.update(_parents(page.src))
    dirs.add("")

    tags: dict[str, Tag] = {}
    for page in pages:
        names = []
        for name in page.tags:
            tag = tags.setdefault(slugify(name), Tag(name=name, slug=slugify(name)))
            if page not in tag.pages:
                tag.pages.append(page)
                names.append(tag.name)
        page.tags = names

    return Site(
        pages=pages,
        static=static,
        by_src={p.src: p for p in pages},
        dirs=dirs,
        tags=dict(sorted(tags.items())),
    )


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        raise MdTermError(f"{path}: not valid UTF-8")


def _check_conflicts(pages: list[Page], static: list[str]) -> None:
    by_url: dict[str, Page] = {}
    for page in pages:
        other = by_url.setdefault(page.url, page)
        if other is not page:
            raise MdTermError(f"{other.src} and {page.src} both map to the URL '/{page.url}'")
    for src in [p.src for p in pages] + static:
        top = src.split("/")[0]
        if "/" in src and top in RESERVED_DIRS or src in RESERVED_FILES or src == "tags.md":
            raise MdTermError(f"{src}: this path is reserved by md-term, please rename it")
    for src in static:
        if src == "index.html" or src.endswith("/index.html"):
            page_url = posixpath.dirname(src)
            if (page_url + "/" if page_url else "") in by_url:
                raise MdTermError(f"{src} conflicts with the page generated for the same URL")
