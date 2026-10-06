from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass, field, fields, replace
from pathlib import Path

CONFIG_NAME = "md-term.toml"

# Presets defined in assets/term.css; the first one is the default.
THEMES = ("phosphor", "amber", "ice", "mono", "dracula", "paper")
# Keys accepted in [colors]; each maps to the CSS variable --<key-with-dashes>.
COLOR_KEYS = ("bg", "bg_raised", "fg", "fg_bright", "fg_dim", "line", "alert", "glow")
# Placeholders accepted in `ps1`. The browser shell fills the same ones (vfs.js).
PS1_FIELDS = ("user", "host", "path", "dir")
PS1_FIELD = re.compile(r"\{(\w*)\}")
# What the home page (the root index.md) may set in its front matter, as
# `site_<name>`: the look and wording of the site, never paths or downloads.
PAGE_SETTINGS = {
    "site_name": "site_name",
    "site_description": "description",
    "site_lang": "lang",
    "site_user": "user",
    "site_host": "host",
    "site_ps1": "ps1",
    "site_motd": "motd",
    "site_theme": "theme",
}
PYTHON_RUNTIMES = ("monty", "pyodide")
# A package name with an optional version specifier, as micropip accepts.
_REQUIREMENT = re.compile(r"[A-Za-z0-9][\w.\-\[\],]*([=<>!~]=?[\w.*,=<>!~]+)?")
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
    ps1: str = "{user}@{host}:{path}$"
    motd: str = ""
    theme: str = THEMES[0]
    colors: dict[str, str] = field(default_factory=dict)
    extra_css: list[str] = field(default_factory=list)
    python: str = ""  # "" (off), "monty" or "pyodide"; `true` in the TOML means "monty"
    python_packages: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.theme not in THEMES:
            raise MdTermError(f"unknown theme '{self.theme}' (choose from: {', '.join(THEMES)})")
        for key, value in self.colors.items():
            if key not in COLOR_KEYS:
                raise MdTermError(f"unknown color '{key}' (choose from: {', '.join(COLOR_KEYS)})")
            if not _CSS_VALUE.fullmatch(value):
                raise MdTermError(f"color '{key}' is not a valid CSS color: {value!r}")
        if self.python is True:
            self.python = "monty"
        elif self.python is False:
            self.python = ""
        if self.python not in ("", *PYTHON_RUNTIMES):
            choices = ", ".join(f'"{name}"' for name in PYTHON_RUNTIMES)
            raise MdTermError(f"'python' must be true, false or one of: {choices}")
        if self.python_packages and self.python != "pyodide":
            raise MdTermError("'python_packages' requires python = \"pyodide\"")
        for package in self.python_packages:
            if not _REQUIREMENT.fullmatch(package):
                raise MdTermError(f"invalid entry in python_packages: {package!r}")
        if not self.ps1.strip():
            raise MdTermError("'ps1' must not be empty")
        for name in PS1_FIELD.findall(self.ps1):
            if name not in PS1_FIELDS:
                fields_ = ", ".join(f"{{{field_}}}" for field_ in PS1_FIELDS)
                raise MdTermError(
                    f"unknown placeholder '{{{name}}}' in ps1 (choose from: {fields_})"
                )
        if not self.host:
            self.host = _host_from(self.site_name)
        if self.site_url and not self.site_url.endswith("/"):
            self.site_url += "/"

    def with_page_settings(self, meta: dict, src: str) -> Config:
        """Applies the `site_*` properties of the home page on top of this config."""
        changes = {}
        for key, option in PAGE_SETTINGS.items():
            value = meta.get(key)
            if value is None or value == "":
                continue
            if not isinstance(value, str):
                raise MdTermError(f"{src}: '{key}' must be text")
            changes[option] = value
        if not changes:
            return self
        # A host that was derived from the old name follows the new name.
        derived = self.host == _host_from(self.site_name)
        if "site_name" in changes and "host" not in changes and derived:
            changes["host"] = ""
        try:
            return replace(self, **changes)
        except MdTermError as exc:
            raise MdTermError(f"{src}: {exc}") from exc

    def prompt(self, vdir: str) -> str:
        """The prompt shown in the virtual directory `vdir` ('/' is the home)."""
        path = "~" if vdir == "/" else "~" + vdir
        values = {
            "user": self.user,
            "host": self.host,
            "path": path,
            "dir": "~" if vdir == "/" else vdir.rsplit("/", 1)[-1],
        }
        return PS1_FIELD.sub(lambda match: values[match.group(1)], self.ps1)

    @property
    def docs_path(self) -> Path:
        return (self.root / self.docs_dir).resolve()

    @property
    def site_path(self) -> Path:
        return (self.root / self.site_dir).resolve()


def _host_from(site_name: str) -> str:
    return re.sub(r"[^\w.-]+", "-", site_name.lower()).strip("-") or "md-term"


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
        elif key in ("extra_css", "python_packages"):
            valid = isinstance(value, list) and all(isinstance(v, str) for v in value)
            expected = "a list of strings"
        elif key == "python":
            valid = isinstance(value, bool | str)
            expected = 'true, false, "monty" or "pyodide"'
        else:
            valid, expected = isinstance(value, str), "a string"
        if not valid:
            raise MdTermError(f"{path}: option '{key}' must be {expected}")
    try:
        return Config(root=path.parent, **data)
    except MdTermError as exc:
        raise MdTermError(f"{path}: {exc}")
