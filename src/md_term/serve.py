from __future__ import annotations

import logging
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from watchfiles import watch

from .build import build
from .config import Config, MdTermError, load_config

log = logging.getLogger("md_term")


class _State:
    version = 0


class _Handler(SimpleHTTPRequestHandler):
    state: _State

    def do_GET(self) -> None:
        if self.path == "/__livereload":
            body = str(self.state.version).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        if self.path != "/__livereload":
            log.info("%s", format % args)


def _rebuild(config_file: Path, fallback: Config, **options: bool) -> Config:
    """Rebuild with a freshly read config; keep the previous one if anything fails."""
    try:
        config = load_config(config_file)
        site = build(config, **options)
        log.info("Built %d page(s) into %s", len(site.pages), config.site_path)
        return config
    except MdTermError as exc:
        log.error("%s (keeping the previous build)", exc)
        return fallback


def watch_and_build(config_file: Path, *, drafts: bool = False) -> None:
    """Builds, then rebuilds whenever the docs or the config change. Never returns.

    Meant for unattended publishing: a broken page is logged and the site that
    is already published stays as it was.
    """
    try:
        config = load_config(config_file)
    except MdTermError as exc:
        raise SystemExit(f"Error: {exc}") from exc
    # The docs may not be there yet (a sync that has not run): create the folder
    # so there is something to watch.
    config.docs_path.mkdir(parents=True, exist_ok=True)
    config = _rebuild(config_file, config, drafts=drafts)
    log.info("Watching %s for changes (Ctrl+C to stop)", config.docs_path)
    try:
        for _ in watch(config.docs_path, config_file.resolve()):
            config = _rebuild(config_file, config, drafts=drafts)
    except KeyboardInterrupt:
        pass


def serve(config_file: Path, host: str, port: int) -> None:
    config = load_config(config_file)
    build(config, drafts=True, livereload=True)

    state = _State()
    handler = type("Handler", (_Handler,), {"state": state})
    server = ThreadingHTTPServer((host, port), partial(handler, directory=str(config.site_path)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    log.info("Serving on http://%s:%d/ (Ctrl+C to stop)", host, port)

    package = Path(__file__).parent  # templates/assets, for working on md-term itself
    paths = [config.docs_path, config_file.resolve(), package]
    try:
        for _ in watch(*paths):
            log.info("Change detected, rebuilding")
            config = _rebuild(config_file, config, drafts=True, livereload=True)
            state.version += 1
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
