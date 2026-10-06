---
title: Olá, mundo
date: 2026-10-05
tags: [novidades, md-term]
description: A primeira versão do md-term.
---

# Olá, mundo

Esta é a primeira versão do md-term: um gerador de sites estáticos para quem
gosta de ler documentação em fonte monoespaçada.

O que já funciona:

- páginas estáticas, legíveis mesmo sem JavaScript
- um shell com `ls`, `cd`, `cat`, `tree` e `grep`
- posts com data, tags e feed RSS

```python
def saudacao(nome: str) -> str:
    # o realce de sintaxe é feito no build
    return f"olá, {nome}"


print(saudacao("mundo"))
```

Os detalhes estão no [guia](../guia/instalacao.md).
