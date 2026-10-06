"""Installs the in-browser Python runtime (Monty) into a built site.

The JavaScript glue is vendored in ``runtimes/monty``. The WebAssembly modules
are too large for that, so they are downloaded once from the npm registry,
verified against pinned hashes and kept in the user's cache directory.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import tarfile
import tempfile
import urllib.request
from importlib import resources
from pathlib import Path

from .config import MdTermError

log = logging.getLogger("md_term")


def _spec_dir() -> Path:
    return Path(str(resources.files("md_term") / "runtimes" / "monty"))


def load_spec() -> dict:
    return json.loads((_spec_dir() / "runtime.json").read_text(encoding="utf-8"))


def cache_dir() -> Path:
    if override := os.environ.get("MD_TERM_CACHE"):
        return Path(override)
    base = os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache"
    return Path(base) / "md-term"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _download(spec: dict, dest: Path) -> None:
    megabytes = sum(f["size"] for f in spec["files"].values()) / 1e6
    log.info(
        "Downloading the Python runtime (Monty %s, %.0f MB); this happens once",
        spec["version"],
        megabytes,
    )
    members = {f["member"]: name for name, f in spec["files"].items()}
    dest.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=dest) as tmp:
        archive = Path(tmp) / "runtime.tgz"
        try:
            with (
                urllib.request.urlopen(spec["tarball"], timeout=60) as response,
                archive.open("wb") as fh,
            ):
                shutil.copyfileobj(response, fh)
        except OSError as exc:
            raise MdTermError(
                f"could not download the Python runtime from {spec['tarball']}: {exc}"
            ) from exc
        with tarfile.open(archive) as tar:
            for member in tar:
                name = members.get(member.name)
                source = tar.extractfile(member) if name else None
                if source is None:
                    continue
                staged = Path(tmp) / name
                with staged.open("wb") as fh:
                    shutil.copyfileobj(source, fh)
                if _sha256(staged) != spec["files"][name]["sha256"]:
                    raise MdTermError(f"Python runtime: checksum mismatch for {name}")
                staged.replace(dest / name)


def ensure_cached(spec: dict) -> Path:
    """Returns the directory holding the verified WebAssembly modules."""
    dest = cache_dir() / f"{spec['name']}-{spec['version']}"

    def missing() -> list[str]:
        return [
            name
            for name, info in spec["files"].items()
            if not (dest / name).is_file() or _sha256(dest / name) != info["sha256"]
        ]

    if missing():
        _download(spec, dest)
        if left := missing():
            raise MdTermError(f"Python runtime: {', '.join(left)} missing from the download")
    return dest


def install(target: Path) -> dict:
    """Copies the runtime into `target` and returns the manifest written there."""
    spec = load_spec()
    cached = ensure_cached(spec)
    target.mkdir(parents=True, exist_ok=True)
    for name in spec["glue"]:
        shutil.copyfile(_spec_dir() / name, target / name)
    for name in spec["files"]:
        shutil.copyfile(cached / name, target / name)
    manifest = {
        "runtime": spec["name"],
        "version": spec["version"],
        "glue": spec["glue"][0],
        "worker": spec["glue"][1],
        "files": {name: info["size"] for name, info in spec["files"].items()},
    }
    (target / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return manifest
