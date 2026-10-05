---
title: Escrevendo páginas
description: Front matter, links entre páginas, posts e tags.
---

# Escrevendo páginas

Todo arquivo `.md` dentro de `docs/` vira uma página. A estrutura de pastas
é a estrutura do site: `docs/guia/comandos.md` aparece no shell como
`~/guia/comandos.md` e é publicado em `/guia/comandos/`.

## Front matter

O cabeçalho YAML é opcional:

```yaml
---
title: Um título
date: 2026-10-05
tags: [python, notas]
description: Resumo usado em buscadores e no feed.
draft: true
---
```

| Campo         | Efeito                                                    |
| ------------- | --------------------------------------------------------- |
| `title`       | título da página; sem ele vale o primeiro `# título`      |
| `date`        | transforma a página em post                               |
| `tags`        | agrupa páginas; veja `tags` e `tag <nome>`                |
| `description` | resumo; sem ele vale o primeiro parágrafo                 |
| `draft`       | fica fora do `build`, mas aparece no `serve`              |

## Links e imagens

Escreva links relativos para o arquivo `.md`, como faria no GitHub:

```markdown
Veja a [configuração](configuracao.md) ou o [blog](../blog/ola-mundo.md).
```

O md-term reescreve esses links para as URLs finais e avisa no build quando
o destino não existe. Imagens e outros arquivos de `docs/` são copiados para
o site no mesmo caminho.

## Posts

Uma página com `date` é um post: entra no comando `posts`, nas páginas de
tag e no feed RSS (`feed.xml`), que exige `site_url` na
[configuração](configuracao.md).

## O que o markdown suporta

- CommonMark, tabelas e ~~tachado~~
- blocos de código com realce de sintaxe
- notas de rodapé[^1]
- [x] listas de tarefas

[^1]: Como esta aqui.
