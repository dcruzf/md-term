---
title: Python no navegador
description: Como ativar o REPL de Python e os blocos de código executáveis, e o que o Monty suporta.
---

# Python no navegador

O md-term pode oferecer um interpretador Python que roda inteiro no
navegador do visitante, sem servidor. Ele é opcional e vem desligado. Há
dois interpretadores à escolha:

```toml
python = "monty"     # leve e rápido, subconjunto de Python
python = "pyodide"   # Python completo, com pacotes
```

`python = true` equivale a `"monty"`.

## Qual escolher

|                          | `monty`                           | `pyodide`                              |
| ------------------------ | --------------------------------- | -------------------------------------- |
| Linguagem                | subconjunto de Python             | CPython 3.14 completo                  |
| Biblioteca padrão        | 19 módulos                        | praticamente inteira                   |
| Pacotes                  | nenhum                            | `numpy`, `pandas`... e PyPI em Python puro |
| Download na primeira vez | 22,6 MB (4,4 a 7,1 comprimido)    | 12,3 MB (cerca de 6 comprimido)        |
| Partida                  | menos de 1 segundo                | cerca de 3 segundos                    |
| De onde vem              | do seu próprio site               | de uma CDN pública (jsDelivr)          |
| Tamanho no site          | cerca de 23 MB                    | 4 KB                                   |
| Limite por execução      | 10 segundos e 256 MB              | nenhum; interrompa com `Ctrl+C`        |
| Após `Ctrl+C`            | reinício imediato                 | reinício em cerca de 2 segundos        |

Use o `monty` para trechos didáticos simples, quando a partida rápida e a
independência de terceiros importam. Use o `pyodide` quando os exemplos
precisam de herança, geradores, bibliotecas ou pacotes.

Com isso o site ganha:

- o comando `python`, que abre um REPL
- `python -c "código"`, para rodar uma linha
- um link `[run]` em cada bloco de código Python dos artigos

Este site usa o `pyodide`. Experimente clicar em `[run]`:

```python
from statistics import mean


class Forma:
    def area(self) -> float:
        raise NotImplementedError


class Retangulo(Forma):
    def __init__(self, largura: float, altura: float):
        self.largura, self.altura = largura, altura

    def area(self) -> float:
        return self.largura * self.altura


def quadrados(limite: int):
    for lado in range(1, limite + 1):
        yield Retangulo(lado, lado)


areas = [forma.area() for forma in quadrados(4)]
print(areas, "média:", mean(areas))
```

Herança, geradores e o módulo `statistics` são coisas que só o `pyodide`
roda. Um exemplo com pacote, que baixa o `numpy` na primeira execução:

```python
import numpy as np

matriz = np.arange(12).reshape(3, 4)
print(matriz)
print("soma por coluna:", matriz.sum(axis=0))
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

O navegador guarda os arquivos em cache, então as próximas visitas não
baixam de novo.

## Pyodide

O [Pyodide](https://pyodide.org/) é o CPython compilado para WebAssembly.

### Pacotes

Os pacotes da distribuição do Pyodide, como `numpy`, `pandas`, `scipy` e
`matplotlib`, são baixados sozinhos no primeiro `import`:

```console
>>> import numpy as np
Loading numpy
Loaded numpy
>>> np.arange(6).reshape(2, 3).sum(axis=0)
array([3, 5, 7])
```

Pacotes do PyPI escritos em Python puro são instalados com o `micropip`. O
REPL aceita `await` direto no prompt:

```console
>>> import micropip
>>> await micropip.install("cowsay")
>>> import cowsay
```

Para o site já iniciar com pacotes instalados, liste-os na configuração:

```toml
python = "pyodide"
python_packages = ["numpy", "rich==13.7.0"]
```

Eles são baixados junto com o interpretador, na primeira vez que o
visitante usa o Python. Um pacote com extensão em C que não foi portado
para o Pyodide não instala.

### Limitações

- Não há sockets, threads nem subprocessos. Requisições HTTP passam pelo
  navegador e dependem de o servidor de destino permitir (CORS).
- `input()` não funciona.
- Não há limite de tempo: um laço infinito roda até um `Ctrl+C`. No celular,
  onde não há `Ctrl+C`, a saída é recarregar a página.
- O interpretador vem de `cdn.jsdelivr.net`. Sem acesso a esse endereço, o
  Python não carrega; o resto do site continua funcionando.

## Monty

O [Monty](https://github.com/pydantic/monty), da Pydantic, é um subconjunto
de Python escrito em Rust. Ele parte rápido e é fácil de interromper, mas
não é o Python completo.

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

Cada execução tem no máximo 10 segundos e 256 MB de memória. Ao estourar um
limite, a sessão é reiniciada.

## Sessão e isolamento

- Após um `Ctrl+C` ou um limite estourado, a sessão é reiniciada e as
  variáveis se perdem. O terminal avisa quando isso acontece.
- O código roda isolado em um Web Worker: não acessa a página nem os
  arquivos do visitante.

## No build

Com o `pyodide`, o build só copia um pequeno arquivo para
`site/assets/python/` e não precisa de rede.

Com o `monty`, o primeiro `md-term build` baixa o interpretador do registro
do npm (o pacote `@pydantic/monty`), confere o conteúdo contra hashes
fixados no md-term e o guarda em `~/.cache/md-term/`. Os builds seguintes
usam o cache e funcionam sem rede. Os arquivos vão para
`site/assets/python/`, o que acrescenta cerca de 23 MB ao site publicado.

| Variável         | Efeito                                          |
| ---------------- | ----------------------------------------------- |
| `MD_TERM_CACHE`  | pasta de cache, no lugar de `~/.cache/md-term`  |
| `XDG_CACHE_HOME` | base do cache quando `MD_TERM_CACHE` não existe |
