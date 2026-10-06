---
title: Configuração
description: Todas as opções do arquivo md-term.toml.
---

# Configuração

O site é configurado pelo arquivo `md-term.toml`, na raiz do projeto. Todas
as opções são opcionais.

```toml
site_name = "meu-site"
description = "Notas em modo texto"
site_url = "https://exemplo.com/"
lang = "pt-BR"

user = "visitante"
host = "meu-site"
motd = "Bem-vindo. Digite 'help'."

theme = "amber"
extra_css = ["assets/custom.css"]

[colors]
alert = "#ff3b3b"
```

Em TOML, as opções simples precisam vir antes de qualquer tabela como
`[colors]`.

| Opção         | Padrão      | Para que serve                                  |
| ------------- | ----------- | ----------------------------------------------- |
| `site_name`   | `md-term`   | nome exibido na barra de título                 |
| `description` | vazio       | subtítulo e descrição do feed                   |
| `site_url`    | vazio       | endereço público; sem ele o feed não é gerado   |
| `lang`        | `en`        | idioma declarado nas páginas                    |
| `docs_dir`    | `docs`      | pasta com o markdown                            |
| `site_dir`    | `site`      | pasta de saída, apagada a cada build            |
| `user`        | `guest`     | usuário mostrado no prompt                      |
| `host`        | do nome     | máquina mostrada no prompt                      |
| `motd`        | vazio       | mensagem exibida na página inicial              |
| `theme`       | `phosphor`  | tema de cores: `phosphor`, `amber`, `ice`, `mono` ou `paper` |
| `[colors]`    | vazio       | cores que substituem as do tema                 |
| `extra_css`   | vazio       | folhas de estilo de `docs/` carregadas depois da padrão |

Uma opção desconhecida ou com o tipo errado interrompe o build com uma
mensagem dizendo qual é.

## Aparência

Temas, cores, fonte e efeitos têm uma página própria:
[Temas e cores](temas.md).

## Caminhos reservados

O build gera `tags/`, `fs.json`, `search.json` e `feed.xml`. Arquivos de
`docs/` com esses nomes causam erro.
