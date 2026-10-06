# md-term

Gerador de sites estáticos que serve markdown em uma interface de terminal.
Parecido com o mkdocs, só que o visitante navega pela base de conhecimento ou
blog com `ls`, `cd`, `cat` e `grep`.

- Cada `.md` vira uma página HTML completa: funciona sem JavaScript, é
  indexável e todo link pode ser compartilhado.
- Com JavaScript, a página ganha um prompt com histórico, autocompletar e
  busca full-text. Tudo o que é listado também é clicável.
- Posts com data, tags e feed RSS.
- Cinco temas de cores (`phosphor`, `amber`, `ice`, `mono`, `paper`) e paleta
  configurável no `md-term.toml`.

## Uso

```bash
pip install md-term     # Python 3.11+
md-term new meu-site    # cria md-term.toml e docs/
cd meu-site
md-term serve           # http://127.0.0.1:8000/, reconstrói ao salvar
md-term build           # gera o site estático em site/
```

A documentação completa está em [docs/](docs/index.md), que é também o site
de exemplo: rode `md-term serve` na raiz deste repositório para vê-la no
terminal.

## Desenvolvimento

```bash
uv sync
uv run md-term serve                  # também observa templates e assets
uv run pytest                         # gerador
node --test "tests/js/*.test.mjs"     # shell do navegador
uv run ruff check . && uv run ruff format --check .
```

O gerador fica em `src/md_term/` (Python). O front-end é JavaScript e CSS
puros em `src/md_term/assets/`, sem etapa de build: `shell.js` e `vfs.js`
não tocam o DOM e são testados com o Node; `term.js` cuida da interface.

## Licença

MIT
