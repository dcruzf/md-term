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
```

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

## Aparência

As cores e a fonte são variáveis CSS em `assets/term.css`. Para mudar o
tema, coloque um `docs/assets/term.css` próprio: ele substitui o original
no build.

## Caminhos reservados

O build gera `tags/`, `fs.json`, `search.json` e `feed.xml`. Arquivos de
`docs/` com esses nomes causam erro.
