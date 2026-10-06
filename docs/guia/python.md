---
title: Python no navegador
description: Como ativar o REPL de Python e os blocos de código executáveis, e o que o Monty suporta.
---

# Python no navegador

O md-term pode oferecer um interpretador Python que roda inteiro no
navegador do visitante, sem servidor. Ele é opcional e vem desligado.

```toml
python = true
```

Com isso o site ganha:

- o comando `python`, que abre um REPL
- `python -c "código"`, para rodar uma linha
- um link `[run]` em cada bloco de código Python dos artigos

Este site está com a opção ligada. Experimente:

```python
def saudacao(nome: str) -> str:
    return f"olá, {nome}"


for nome in ["mundo", "md-term"]:
    print(saudacao(nome))
```

## O REPL

```console
$ python
>>> x = [n * n for n in range(5)]
>>> sum(x)
30
>>> def dobro(n):
...     return n * 2
...
>>> dobro(21)
42
>>> exit()
```

- Um bloco (`def`, `for`, `if`...) é executado quando você envia uma linha
  vazia.
- `Tab` insere quatro espaços, `↑` e `↓` percorrem o histórico do REPL.
- `_` guarda o último valor mostrado.
- `Ctrl+C` interrompe o código em execução. `Ctrl+D` ou `exit()` voltam ao
  shell.
- As variáveis valem enquanto a página estiver aberta, inclusive entre o
  REPL, o `python -c` e os blocos `[run]`.

## Download sob demanda

Nada do interpretador é baixado ao abrir o site. O download acontece na
primeira vez que o visitante usa o Python, com uma barra de progresso no
terminal:

```text
Downloading Python [#########...........]  48%  10.9/22.7 MB
```

O arquivo tem 22,6 MB. Com a compressão que a hospedagem aplica, o visitante
baixa perto de 7 MB com gzip ou 4,4 MB com brotli. O navegador guarda o
arquivo em cache, então as próximas visitas não baixam de novo.

## O que o Monty roda

O interpretador é o [Monty](https://github.com/pydantic/monty), da Pydantic:
um subconjunto de Python escrito em Rust. Ele parte rápido e é fácil de
interromper, mas não é o Python completo.

| Funciona                                             | Não funciona                                  |
| ---------------------------------------------------- | --------------------------------------------- |
| funções, closures, `lambda`, decoradores de função   | herança de classes                            |
| classes simples e `@dataclass`                       | `yield` e geradores                           |
| f-strings, comprehensions, desempacotamento          | `@property`, `@staticmethod`, `@classmethod`  |
| `try`/`except`/`finally`, `with`, `async`/`await`    | `match`, `del`                                |
| `print()`                                            | `input()`                                     |

Módulos disponíveis: `asyncio`, `base64`, `binascii`, `collections`, `copy`,
`dataclasses`, `datetime`, `functools`, `itertools`, `json`, `math`, `os`,
`pathlib`, `random`, `re`, `sys`, `time`, `typing` e `unicodedata`. Não há
como instalar pacotes: `import numpy` falha.

O que não é suportado gera um erro claro, por exemplo:

```text
NotImplementedError: The monty syntax parser does not yet support class inheritance and metaclasses
```

A lista completa das diferenças está na
[documentação do Monty](https://github.com/pydantic/monty/tree/main/docs/limitations).

## Limites

- Cada execução tem no máximo 10 segundos e 256 MB de memória.
- Ao estourar um limite, ou após um `Ctrl+C`, a sessão é reiniciada e as
  variáveis se perdem. O terminal avisa quando isso acontece.
- O código roda isolado em um Web Worker: não acessa a página, a rede nem
  os arquivos do visitante.

## No build

Com `python = true`, o primeiro `md-term build` baixa o interpretador do
registro do npm (o pacote `@pydantic/monty`), confere o conteúdo contra
hashes fixados no md-term e o guarda em `~/.cache/md-term/`. Os builds
seguintes usam o cache e funcionam sem rede.

| Variável         | Efeito                                         |
| ---------------- | ---------------------------------------------- |
| `MD_TERM_CACHE`  | pasta de cache, no lugar de `~/.cache/md-term` |
| `XDG_CACHE_HOME` | base do cache quando `MD_TERM_CACHE` não existe |

Os arquivos vão para `site/assets/python/`, o que acrescenta cerca de 23 MB
ao site publicado.
