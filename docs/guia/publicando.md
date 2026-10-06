---
title: Publicando
description: Como gerar o site e hospedá-lo no GitHub Pages ou em qualquer servidor estático.
---

# Publicando

O `md-term build` gera uma pasta `site/` só com arquivos estáticos. Qualquer
hospedagem de arquivos serve: GitHub Pages, Netlify, Cloudflare Pages, um
bucket S3 ou um nginx.

```bash
md-term build
```

## Antes de publicar

- Defina `site_url` no `md-term.toml` com o endereço público. Sem ele o feed
  RSS não é gerado, porque os links do feed precisam ser absolutos.
- Rascunhos (`draft: true`) ficam fora do build. Use `--drafts` se quiser
  incluí-los em um ambiente de prévia.
- Confira os avisos do build: links para arquivos `.md` que não existem são
  listados ali.
- Com `python = true`, o build precisa de rede na primeira vez, para baixar
  o interpretador, e o site publicado fica cerca de 23 MB maior.

## Subcaminhos

Todos os links internos são relativos. O mesmo build funciona na raiz de um
domínio (`https://exemplo.com/`) e em um subcaminho
(`https://usuario.github.io/projeto/`), sem nenhuma opção extra.

## GitHub Pages

Um fluxo de trabalho que publica a cada push no `main`. Salve como
`.github/workflows/site.yml` e, nas configurações do repositório, escolha
"GitHub Actions" como fonte do Pages.

```yaml
name: site
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install md-term
      - run: md-term build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Outras hospedagens

Em serviços que constroem o site para você, configure:

| Campo                | Valor                                  |
| -------------------- | -------------------------------------- |
| comando de build     | `pip install md-term && md-term build` |
| pasta de publicação  | `site`                                 |

Em um servidor próprio, basta copiar a pasta:

```bash
md-term build
rsync -av --delete site/ usuario@servidor:/var/www/meu-site/
```

O servidor precisa entregar `index.html` quando o endereço termina em `/`,
que é o comportamento padrão de praticamente todos.

## A pasta site/

O build apaga e recria `site/` a cada execução. Por segurança, ele se recusa
a apagar uma pasta que não esteja vazia e que não tenha sido criada pelo
próprio md-term. Não edite arquivos ali: as mudanças se perdem no próximo
build. A pasta não precisa ir para o controle de versão.
