---
title: Instalação
description: Como instalar o md-term e gerar o primeiro site.
---

# Instalação

O md-term precisa de Python 3.11 ou mais novo.

```bash
pip install md-term
```

## Primeiro site

```bash
md-term new meu-site
cd meu-site
md-term serve
```

O comando `new` cria um `md-term.toml` e uma pasta `docs/` com duas páginas
de exemplo. O `serve` abre o site em <http://127.0.0.1:8000/> e o reconstrói
a cada arquivo salvo, incluindo os rascunhos.

## Publicando

```bash
md-term build
```

O resultado fica na pasta `site/`: só arquivos estáticos, prontos para
qualquer hospedagem. Os links são relativos, então o site funciona tanto na
raiz de um domínio quanto em um subcaminho como `usuario.github.io/projeto/`.

| Comando         | O que faz                                     |
| --------------- | --------------------------------------------- |
| `md-term new`   | cria um site inicial                          |
| `md-term serve` | servidor local com recarga automática         |
| `md-term build` | gera o site estático (`--drafts` inclui rascunhos) |

Os detalhes de cada comando estão na [referência da linha de comando](../referencia/cli.md).

Próximo passo: [escrever páginas](escrevendo.md).
