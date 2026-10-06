from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass, field, fields
from pathlib import Path

CONFIG_NAME = "md-term.toml"

# Presets defined in assets/term.css; the first one is the default.
THEMES = ("phosphor", "amber", "ice", "mono", "dracula", "paper")
# Keys accepted in [colors]; each maps to the CSS variable --<key-with-dashes>.
COLOR_KEYS = ("bg", "bg_raised", "fg", "fg_bright", "fg_dim", "line", "alert", "glow")
_CSS_VALUE = re.compile(r"[#\w(),.%/\s-]+")


class MdTermError(Exception):
    """A problem the user can fix: bad config, bad front matter, path conflicts."""


@dataclass
class Config:
    root: Path
    site_name: str = "md-term"
    site_url: str = ""
    description: str = ""
    lang: str = "en"
    docs_dir: str = "docs"
    site_dir: str = "site"
    user: str = "guest"
    host: str = ""
    motd: str = ""
    theme: str = THEMES[0]
    colors: dict[str, str] = field(default_factory=dict)
    extra_css: list[str] = field(default_factory=list)
    python: bool = False

    def __post_init__(self) -> None:
        if self.theme not in THEMES:
            raise MdTermError(f"unknown theme '{self.theme}' (choose from: {', '.join(THEMES)})")
        for key, value in self.colors.items():
            if key not in COLOR_KEYS:
                raise MdTermError(f"unknown color '{key}' (choose from: {', '.join(COLOR_KEYS)})")
            if not _CSS_VALUE.fullmatch(value):
                raise MdTermError(f"color '{key}' is not a valid CSS color: {value!r}")
        if not self.host:
            self.host = re.sub(r"[^\w.-]+", "-", self.site_name.lower()).strip("-") or "md-term"
        if self.site_url and not self.site_url.endswith("/"):
            self.site_url += "/"

    @property
    def docs_path(self) -> Path:
        return (self.root / self.docs_dir).resolve()

    @property
    def site_path(self) -> Path:
        return (self.root / self.site_dir).resolve()


def load_config(path: Path) -> Config:
    path = path.resolve()
    try:
        with path.open("rb") as fh:
            data = tomllib.load(fh)
    except FileNotFoundError:
        raise MdTermError(f"config file not found: {path} (run `md-term new` to create one)")
    except tomllib.TOMLDecodeError as exc:
        raise MdTermError(f"{path}: {exc}")

    known = {f.name for f in fields(Config)} - {"root"}
    unknown = sorted(set(data) - known)
    if unknown:
        raise MdTermError(f"{path}: unknown option(s): {', '.join(unknown)}")
    for key, value in data.items():
        if key == "colors":
            valid = isinstance(value, dict) and all(isinstance(v, str) for v in value.values())
            expected = "a table of strings"
        elif key == "extra_css":
            valid = isinstance(value, list) and all(isinstance(v, str) for v in value)
            expected = "a list of strings"
        elif key == "python":
            valid, expected = isinstance(value, bool), "true or false"
        else:
            valid, expected = isinstance(value, str), "a string"
        if not valid:
            raise MdTermError(f"{path}: option '{key}' must be {expected}")
    try:
        return Config(root=path.parent, **data)
    except MdTermError as exc:
        raise MdTermError(f"{path}: {exc}")
