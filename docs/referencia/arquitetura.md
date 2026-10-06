---
title: Como funciona
description: O que o build gera, como as URLs são formadas e como o shell navega.
---

# Como funciona

O md-term tem duas metades: um gerador em Python, que roda no build, e um
shell em JavaScript, que roda no navegador do visitante.

## O que o build gera

```text
site/
├── index.html                 uma página por arquivo markdown
├── guia/
│   ├── index.html             listagem gerada para pastas sem index.md
│   └── instalacao/index.html
├── tags/                      índice de tags e uma página por tag
├── assets/
│   ├── term.css               tema
│   └── js/                    shell do navegador
├── fs.json                    árvore de arquivos para o shell
├── search.json                texto de todas as páginas, para o grep
└── feed.xml                   RSS, quando há posts e site_url
```

## De arquivos a URLs

| Arquivo em `docs/`      | No shell                  | URL publicada         |
| ----------------------- | ------------------------- | --------------------- |
| `index.md`              | `~/index.md`              | `/`                   |
| `guia/instalacao.md`    | `~/guia/instalacao.md`    | `/guia/instalacao/`   |
| `guia/index.md`         | `~/guia/index.md`         | `/guia/`              |
| `blog/foto.png`         | não aparece               | `/blog/foto.png`      |

Arquivos e pastas que começam com ponto são ignorados. Uma pasta sem
`index.md` ganha uma página de listagem, equivalente a um `ls`.

## Páginas completas

Cada página HTML já traz o conteúdo dentro da moldura do terminal, como se
o comando `cat` tivesse acabado de rodar. Por isso:

- o site funciona com JavaScript desligado, navegando por links e pelas
  listagens de diretório
- buscadores indexam o texto normalmente
- qualquer endereço pode ser aberto direto ou compartilhado

## O shell

Quando o JavaScript carrega, ele lê o `fs.json` e habilita o prompt. A
partir daí:

- `ls`, `cd`, `tree`, `posts` e `tags` são respondidos na hora, a partir do
  `fs.json`
- `cat` busca o HTML da página de destino, extrai o artigo e o imprime
  abaixo do comando; o endereço do navegador muda junto, e o botão voltar
  funciona
- `grep` baixa o `search.json` na primeira busca e procura linha a linha no
  markdown original
- links dentro dos artigos viram um `cat`, sem recarregar a página

O histórico de comandos fica guardado durante a sessão do navegador, e o
tema escolhido com `theme` fica salvo entre visitas. Nada é enviado a
servidor algum: o site é só arquivos estáticos.

## Markdown

A conversão usa o markdown-it-py no padrão CommonMark, com tabelas, texto
tachado, notas de rodapé, listas de tarefas e âncoras nos títulos. O realce
de sintaxe é feito no build pelo Pygments, então o navegador não carrega
nenhuma biblioteca para isso. HTML escrito dentro do markdown é mantido.

## fs.json

```json
{
  "nodes": {
    "/": { "type": "dir", "url": "", "children": ["blog", "index.md"] },
    "/blog/ola.md": {
      "type": "file",
      "url": "blog/ola/",
      "title": "Olá",
      "date": "2026-10-05",
      "tags": ["novidades"]
    }
  },
  "tags": { "novidades": { "url": "tags/novidades/", "count": 1 } }
}
```

As URLs são relativas à raiz do site.
