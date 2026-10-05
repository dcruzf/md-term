from __future__ import annotations

import logging
from pathlib import Path

import click

from . import __version__
from .build import build as build_site
from .config import CONFIG_NAME, MdTermError, load_config

config_option = click.option(
    "-f",
    "--config-file",
    type=click.Path(dir_okay=False, path_type=Path),
    default=CONFIG_NAME,
    show_default=True,
    help="Path to the site configuration.",
)


class _Group(click.Group):
    def invoke(self, ctx: click.Context):
        try:
            return super().invoke(ctx)
        except MdTermError as exc:
            raise click.ClickException(str(exc))


@click.group(cls=_Group)
@click.version_option(__version__, prog_name="md-term")
def main() -> None:
    """Build a terminal-style site out of a folder of markdown."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


@main.command()
@config_option
@click.option("--drafts", is_flag=True, help="Include pages marked `draft: true`.")
def build(config_file: Path, drafts: bool) -> None:
    """Generate the static site."""
    config = load_config(config_file)
    site = build_site(config, drafts=drafts)
    click.echo(f"Built {len(site.pages)} page(s) into {config.site_path}")


@main.command()
@config_option
@click.option(
    "-a", "--addr", default="127.0.0.1:8000", show_default=True, help="HOST:PORT to bind."
)
def serve(config_file: Path, addr: str) -> None:
    """Serve the site locally, rebuilding when files change (drafts included)."""
    from .serve import serve as serve_site

    host, _, port = addr.rpartition(":")
    if not host or not port.isdigit():
        raise click.BadParameter("expected HOST:PORT", param_hint="--addr")
    serve_site(config_file, host, int(port))


@main.command()
@click.argument("directory", type=click.Path(file_okay=False, path_type=Path), default=".")
def new(directory: Path) -> None:
    """Create a starter site in DIRECTORY."""
    from .scaffold import scaffold

    for path in scaffold(directory):
        click.echo(f"created {path}")
    click.echo("Run `md-term serve` to preview it.")
