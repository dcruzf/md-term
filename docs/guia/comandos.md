---
title: Comandos do shell
description: Referência dos comandos disponíveis para o visitante.
---

# Comandos do shell

O prompt aparece logo depois da última saída, como em um terminal de verdade.
Basta começar a digitar em qualquer lugar da página para voltar a ele. Tudo o
que um comando lista também é clicável, então dá para navegar sem digitar nada.

| Comando                  | O que faz                                       |
| ------------------------ | ----------------------------------------------- |
| `help`                   | lista os comandos                               |
| `ls [caminho]`           | lista um diretório                              |
| `cd [dir]`               | muda de diretório; sem argumento volta para `~` |
| `pwd`                    | mostra o diretório atual                        |
| `tree [dir]`             | mostra o diretório como árvore                  |
| `cat <arquivo>`          | abre uma página (também `open`)                 |
| `grep [-i] <padrão> [caminho]` | busca em todas as páginas (também `search`) |
| `posts`                  | lista os posts, do mais novo ao mais antigo     |
| `tags`                   | lista as tags                                   |
| `tag <nome>`             | lista as páginas de uma tag                     |
| `history`                | mostra os comandos já digitados                 |
| `clear`                  | limpa a tela                                    |

## Atalhos

- `Tab` completa comandos, caminhos e tags
- `↑` e `↓` percorrem o histórico
- `Ctrl+L` limpa a tela e `Ctrl+C` descarta a linha

## Busca

O `grep` procura linha a linha no markdown original e aceita expressões
regulares. Um padrão todo em minúsculas ignora maiúsculas e minúsculas:

```console
$ grep front.matter
$ grep "site_url" guia
$ grep -i RSS
```

## Caminhos

`~` é a raiz do site. Valem caminhos relativos, `..` e a extensão `.md` é
opcional no `cat`:

```console
$ cd guia
$ cat ../blog/ola-mundo
```
