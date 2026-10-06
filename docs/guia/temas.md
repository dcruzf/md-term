---
title: Temas e cores
description: Os temas prontos do md-term e as formas de mudar cores, fonte e efeitos.
---

# Temas e cores

Há quatro formas de mudar a aparência, da mais simples à mais livre:

1. [escolher um tema pronto](#temas-prontos)
2. [ajustar cores no `md-term.toml`](#cores-próprias)
3. [acrescentar CSS](#css-extra) para fonte, largura e efeitos
4. [substituir a folha de estilo inteira](#substituindo-o-css)

## Temas prontos

| Tema | Paleta | Descrição |
| --- | --- | --- |
| `phosphor` | <span title="#030b06" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#030b06;border:1px solid #888"></span><span title="#08170d" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#08170d;border:1px solid #888"></span><span title="#9be8ae" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#9be8ae;border:1px solid #888"></span><span title="#4dff88" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#4dff88;border:1px solid #888"></span><span title="#4c9462" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#4c9462;border:1px solid #888"></span><span title="#17402a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#17402a;border:1px solid #888"></span><span title="#ffb454" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffb454;border:1px solid #888"></span> | fósforo verde, o padrão |
| `amber` | <span title="#0c0700" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#0c0700;border:1px solid #888"></span><span title="#1a1003" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#1a1003;border:1px solid #888"></span><span title="#f2c078" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#f2c078;border:1px solid #888"></span><span title="#ffb000" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffb000;border:1px solid #888"></span><span title="#a3742a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#a3742a;border:1px solid #888"></span><span title="#46300c" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#46300c;border:1px solid #888"></span><span title="#ff6b4a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ff6b4a;border:1px solid #888"></span> | monitor âmbar |
| `ice` | <span title="#030910" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#030910;border:1px solid #888"></span><span title="#081624" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#081624;border:1px solid #888"></span><span title="#a9d6f5" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#a9d6f5;border:1px solid #888"></span><span title="#5cc8ff" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#5cc8ff;border:1px solid #888"></span><span title="#4f86ad" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#4f86ad;border:1px solid #888"></span><span title="#173650" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#173650;border:1px solid #888"></span><span title="#ffd166" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffd166;border:1px solid #888"></span> | azul frio |
| `mono` | <span title="#0a0a0a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#0a0a0a;border:1px solid #888"></span><span title="#161616" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#161616;border:1px solid #888"></span><span title="#d0d0d0" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#d0d0d0;border:1px solid #888"></span><span title="#ffffff" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffffff;border:1px solid #888"></span><span title="#858585" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#858585;border:1px solid #888"></span><span title="#333333" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#333333;border:1px solid #888"></span><span title="#ffcc66" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ffcc66;border:1px solid #888"></span> | cinza neutro sobre preto |
| `dracula` | <span title="#282a36" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#282a36;border:1px solid #888"></span><span title="#343746" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#343746;border:1px solid #888"></span><span title="#f8f8f2" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#f8f8f2;border:1px solid #888"></span><span title="#bd93f9" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#bd93f9;border:1px solid #888"></span><span title="#8b98c9" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#8b98c9;border:1px solid #888"></span><span title="#44475a" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#44475a;border:1px solid #888"></span><span title="#ff79c6" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#ff79c6;border:1px solid #888"></span> | a paleta [Dracula](https://draculatheme.com/), roxo sobre grafite |
| `paper` | <span title="#f4f1e8" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#f4f1e8;border:1px solid #888"></span><span title="#e9e5d8" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#e9e5d8;border:1px solid #888"></span><span title="#2b2b26" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#2b2b26;border:1px solid #888"></span><span title="#000000" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#000000;border:1px solid #888"></span><span title="#6b6a60" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#6b6a60;border:1px solid #888"></span><span title="#c9c4b3" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#c9c4b3;border:1px solid #888"></span><span title="#b3261e" style="display:inline-block;width:2.5ch;height:1.1em;vertical-align:middle;background:#b3261e;border:1px solid #888"></span> | claro, para ler de dia |

As amostras seguem a ordem das variáveis: fundo, fundo elevado, texto, texto
brilhante, texto apagado, linhas e alerta.

Escolha o tema do site no `md-term.toml`:

```toml
theme = "amber"
```

### Experimentando

O visitante pode trocar de tema pelo shell. A escolha fica salva no navegador
dele e vale para o site inteiro:

```console
$ theme
$ theme amber
$ theme paper
```

Experimente agora: digite `theme ice`, ou clique em `[theme]` na barra de
comandos. Para voltar ao tema do site, `theme phosphor`.

## Cores próprias

A tabela `[colors]` redefine cores do tema escolhido. Só é preciso informar o
que muda; o resto vem do tema.

```toml
theme = "phosphor"

[colors]
fg_bright = "#00ff9c"
alert = "#ff5c8a"
```

| Chave       | Variável CSS  | Onde aparece                                    |
| ----------- | ------------- | ----------------------------------------------- |
| `bg`        | `--bg`        | fundo da página                                 |
| `bg_raised` | `--bg-raised` | blocos de código e o clarão atrás da página     |
| `fg`        | `--fg`        | texto corrido                                   |
| `fg_bright` | `--fg-bright` | títulos, links, comandos, negrito               |
| `fg_dim`    | `--fg-dim`    | prompt, metadados, pontuação decorativa         |
| `line`      | `--line`      | bordas e separadores                            |
| `alert`     | `--alert`     | erros, resultados do `grep`, strings no código  |
| `glow`      | `--glow`      | halo do texto brilhante; `transparent` desliga  |

Os valores aceitam qualquer cor CSS: `#rrggbb`, `rgb(...)`, `hsl(...)` ou um
nome como `black`.

As cores de `[colors]` valem para o tema configurado em `theme`. Se o
visitante trocar para outro tema com o comando `theme`, ele vê a paleta
original daquele tema.

### Paletas de exemplo

Uma paleta completa, no estilo Matrix:

```toml
[colors]
bg = "#000000"
bg_raised = "#001a00"
fg = "#00c853"
fg_bright = "#69ff97"
fg_dim = "#007a33"
line = "#003d1a"
alert = "#ffffff"
```

Roxo sobre preto, mais escuro que o `dracula`:

```toml
[colors]
bg = "#0d0b12"
bg_raised = "#17131f"
fg = "#cfc6e6"
fg_bright = "#c49bff"
fg_dim = "#7d7399"
line = "#352d4a"
alert = "#ffb86c"
```

Tema claro em tons de sépia, partindo do `paper`:

```toml
theme = "paper"

[colors]
bg = "#f6efe0"
bg_raised = "#ebe2cd"
fg = "#3b3024"
fg_bright = "#1f1408"
alert = "#a8421c"
```

### Escolhendo boas cores

- Mantenha `fg` e `fg_dim` bem legíveis sobre `bg`. Um contraste de pelo
  menos 4,5:1 é a referência para texto corrido.
- `fg_bright` também é usado como fundo de links em foco e de seleção, com
  `bg` como cor do texto. Os dois precisam contrastar entre si.
- `alert` deve se destacar tanto de `fg` quanto de `bg`.
- Em temas claros, parta do `paper`: ele já desliga o halo e suaviza as
  linhas de varredura.

## CSS extra

Para o que não é cor, aponte `extra_css` para arquivos dentro de `docs/`.
Eles são carregados depois da folha de estilo padrão.

```toml
extra_css = ["assets/custom.css"]
```

Fonte e largura da coluna de texto são variáveis:

```css
:root {
  --font: "Fira Code", monospace;
  --measure: 100ch;
}
```

O md-term não carrega fontes da web: a fonte precisa estar instalada no
computador do visitante ou ser declarada com `@font-face` no seu CSS.

Desligar as linhas de varredura e a vinheta:

```css
body::after {
  display: none;
}
```

Aumentar o texto:

```css
body {
  font-size: 17px;
}
```

Para mudar cores por CSS em vez de `[colors]`, use o mesmo seletor dos temas,
porque um `:root` simples perde para ele:

```css
:root[data-theme="amber"] {
  --alert: #ff3b3b;
}
```

## Substituindo o CSS

Para controle total, coloque uma cópia modificada da folha de estilo em
`docs/assets/term.css`. No build ela substitui a original. O custo é que
você deixa de receber as melhorias do tema padrão a cada atualização.

## Referência dos temas

| Variável | `phosphor` | `amber` | `ice` | `mono` | `dracula` | `paper` |
| --- | --- | --- | --- | --- | --- | --- |
| `--bg` | `#030b06` | `#0c0700` | `#030910` | `#0a0a0a` | `#282a36` | `#f4f1e8` |
| `--bg-raised` | `#08170d` | `#1a1003` | `#081624` | `#161616` | `#343746` | `#e9e5d8` |
| `--fg` | `#9be8ae` | `#f2c078` | `#a9d6f5` | `#d0d0d0` | `#f8f8f2` | `#2b2b26` |
| `--fg-bright` | `#4dff88` | `#ffb000` | `#5cc8ff` | `#ffffff` | `#bd93f9` | `#000000` |
| `--fg-dim` | `#4c9462` | `#a3742a` | `#4f86ad` | `#858585` | `#8b98c9` | `#6b6a60` |
| `--line` | `#17402a` | `#46300c` | `#173650` | `#333333` | `#44475a` | `#c9c4b3` |
| `--alert` | `#ffb454` | `#ff6b4a` | `#ffd166` | `#ffcc66` | `#ff79c6` | `#b3261e` |
