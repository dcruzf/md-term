---
title: Linha de comando
description: Referência dos comandos md-term new, serve e build.
---

# Linha de comando

```console
$ md-term --help
$ md-term --version
```

Todos os comandos procuram o `md-term.toml` na pasta atual. Use `-f` para
apontar outro arquivo; os caminhos `docs_dir` e `site_dir` são relativos à
pasta onde ele está.

## md-term new

```console
$ md-term new [DIRETÓRIO]
```

Cria um site inicial em `DIRETÓRIO` (padrão: a pasta atual), com:

- `md-term.toml`
- `docs/index.md`
- `docs/blog/hello-world.md`

O comando não sobrescreve nada: se algum desses arquivos já existir, ele
para com um erro.

## md-term serve

```console
$ md-term serve [-f ARQUIVO] [-a HOST:PORTA]
```

Constrói o site e o serve localmente, por padrão em `127.0.0.1:8000`.

| Opção                 | Padrão           | Efeito                          |
| --------------------- | ---------------- | ------------------------------- |
| `-f`, `--config-file` | `md-term.toml`   | arquivo de configuração         |
| `-a`, `--addr`        | `127.0.0.1:8000` | endereço e porta do servidor    |

Enquanto roda, ele observa a pasta de documentos e o arquivo de
configuração. A cada mudança o site é reconstruído e o navegador recarrega
sozinho. Rascunhos são incluídos. Um erro de build aparece no terminal e o
servidor continua no ar com a última versão válida.

Para expor o servidor na rede local:

```console
$ md-term serve -a 0.0.0.0:8000
```

## md-term build

```console
$ md-term build [-f ARQUIVO] [--drafts]
```

Gera o site estático em `site_dir`.

| Opção                 | Padrão         | Efeito                                 |
| --------------------- | -------------- | -------------------------------------- |
| `-f`, `--config-file` | `md-term.toml` | arquivo de configuração                |
| `--drafts`            | desligado      | inclui páginas com `draft: true`       |

### Avisos e erros

O build avisa, sem parar, quando:

- um link aponta para um `.md` que não existe
- há posts mas `site_url` está vazio, e por isso o feed não é gerado
- um arquivo listado em `extra_css` não existe em `docs/`

E para com erro quando:

- o front matter é inválido, ou `date` não está no formato `AAAA-MM-DD`
- dois arquivos geram a mesma URL, como `guia.md` e `guia/index.md`
- um arquivo usa um [caminho reservado](../guia/configuracao.md#caminhos-reservados)
- o `md-term.toml` tem uma opção desconhecida, um tema inexistente ou uma
  cor inválida
- `site_dir` não está vazio e não foi criado pelo md-term

Veja [como publicar](../guia/publicando.md) o resultado.
