from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass, fields
from pathlib import Path

CONFIG_NAME = "md-term.toml"


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

    def __post_init__(self) -> None:
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

    known = {f.name: f.type for f in fields(Config) if f.name != "root"}
    unknown = sorted(set(data) - set(known))
    if unknown:
        raise MdTermError(f"{path}: unknown option(s): {', '.join(unknown)}")
    for key, value in data.items():
        if not isinstance(value, str):
            raise MdTermError(f"{path}: option '{key}' must be a string")
    return Config(root=path.parent, **data)
