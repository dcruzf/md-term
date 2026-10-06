// Mermaid diagrams. The library is large, so it is fetched from a CDN only
// when a page that is being shown actually contains a ```mermaid block.

const MERMAID = "https://cdn.jsdelivr.net/npm/mermaid@12.1.0/dist/mermaid.esm.min.mjs";

let library = null;
let counter = 0;

// Mermaid's "base" theme does arithmetic on its colors and only takes hex.
function hex(color) {
  const probe = document.createElement("span");
  probe.style.color = color;
  document.body.append(probe);
  const [r, g, b] = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
  probe.remove();
  return "#" + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
}

function themeVariables() {
  const style = getComputedStyle(document.documentElement);
  const color = (name) => hex(style.getPropertyValue(name).trim());
  const [bg, raised, fg, bright, dim] = ["--bg", "--bg-raised", "--fg", "--fg-bright", "--fg-dim"].map(color);
  return {
    darkMode: style.colorScheme !== "light",
    fontFamily: style.getPropertyValue("--font"),
    background: bg,
    primaryColor: raised,
    primaryTextColor: fg,
    primaryBorderColor: bright,
    secondaryColor: raised,
    tertiaryColor: bg,
    lineColor: dim,
    textColor: fg,
    noteBkgColor: raised,
    noteTextColor: fg,
    noteBorderColor: dim,
  };
}

async function draw(figure) {
  library ??= import(MERMAID).catch((err) => {
    library = null; // let the next diagram retry the download
    throw err;
  });
  const mermaid = (await library).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: themeVariables(),
  });
  const { svg } = await mermaid.render(`mermaid-${(counter += 1)}`, figure.dataset.source);
  figure.innerHTML = svg;
}

// Replaces each <pre class="mermaid"> in `scope` with the drawn diagram.
export async function renderDiagrams(scope) {
  for (const block of scope.querySelectorAll("pre.mermaid")) {
    const figure = document.createElement("figure");
    figure.className = "diagram";
    figure.dataset.source = block.textContent;
    try {
      await draw(figure);
      block.replaceWith(figure);
    } catch (err) {
      block.classList.add("failed");
      block.title = `Diagram not drawn: ${err.message}`;
    }
  }
}

// Diagrams carry the colors of the theme they were drawn in.
export async function redrawDiagrams() {
  for (const figure of document.querySelectorAll("figure.diagram")) {
    await draw(figure).catch(() => {});
  }
}
