# md-term

O **md-term** transforma uma pasta de arquivos markdown em um site estático
com cara de terminal. É parecido com o mkdocs, só que o visitante navega pelo
conteúdo como quem usa um shell.

```console
$ ls
blog/  guia/  index.md
$ cat guia/instalacao.md
```

## Por onde começar

- [Instalação](guia/instalacao.md): crie e publique o seu primeiro site
- [Escrevendo páginas](guia/escrevendo.md): front matter, links e posts
- [Comandos do shell](guia/comandos.md): tudo o que o visitante pode digitar
- [Configuração](guia/configuracao.md): as opções do `md-term.toml`

## Como funciona

Cada `.md` vira uma página HTML completa, então o site funciona sem
JavaScript, é indexado por buscadores e todo link pode ser compartilhado.
Com JavaScript ligado, a página ganha um prompt de verdade: `ls`, `cd`,
`cat`, `grep`, histórico e autocompletar com Tab.

Novidades ficam no [blog](blog/ola-mundo.md).
