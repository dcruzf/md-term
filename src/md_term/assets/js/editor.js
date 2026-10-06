// The full-screen-ish editor opened by `edit`. CodeMirror is loaded on first
// use; if that fails, a plain <textarea> does the job without highlighting.
//
// Keys: Ctrl+S saves, Ctrl+Enter saves and runs, Esc leaves. Not nano's ^O and
// ^X: browsers own those (open file, cut) and a page cannot take them over.

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

function plainEditor(parent, doc, keys, onChange) {
  const area = el("textarea", "editor-plain");
  area.value = doc;
  area.spellcheck = false;
  area.rows = Math.min(24, Math.max(8, doc.split("\n").length + 2));
  area.addEventListener("input", onChange);
  area.addEventListener("keydown", (event) => {
    const mod = event.ctrlKey || event.metaKey;
    const name = mod ? `Mod-${event.key === "Enter" ? "Enter" : event.key.toLowerCase()}` : event.key;
    if (name === "Tab") {
      event.preventDefault();
      area.setRangeText("    ", area.selectionStart, area.selectionEnd, "end");
      onChange();
    } else if (keys[name]) {
      event.preventDefault();
      keys[name]();
    }
  });
  parent.append(area);
  return {
    getValue: () => area.value,
    lineCount: () => area.value.split("\n").length,
    focus: () => area.focus(),
    destroy: () => area.remove(),
  };
}

// Opens `content` for editing inside `host`. `save(text)` returns an error
// message or null. Resolves when the visitor leaves, with
// { saved, run, text, lines }: whether anything was written, whether they
// asked to run it, and the text as last saved.
export async function openEditor({ host, label, content, original = content, language, canRun, save }) {
  const panel = el("div", "editor");
  const state = el("span", "editor-state");
  const bar = el("div", "editor-bar");
  bar.append(el("span", "editor-title", `edit: ${label}`), " ", state);
  const body = el("div", "editor-body");
  const message = el("span", "editor-message");
  const keysRow = el("div", "editor-keys");
  panel.append(bar, body, keysRow);
  host.append(panel);

  let editor;
  let saved = false;
  let savedText = original;
  let confirming = false;
  let finish;
  const closed = new Promise((resolve) => (finish = resolve));

  const modified = () => editor.getValue() !== savedText;
  const refresh = () => {
    confirming = false;
    state.textContent = modified() ? "[modified]" : "";
    message.textContent = "";
    keysRow.scrollIntoView({ block: "nearest" }); // the keys stay in view as the text grows
  };
  const write = () => {
    const text = editor.getValue();
    const problem = save(text);
    if (problem) {
      message.textContent = `not saved: ${problem}`;
      return false;
    }
    saved = true;
    savedText = text;
    refresh();
    message.textContent = `wrote ${editor.lineCount()} line(s)`;
    return true;
  };
  const close = (run) => {
    const lines = editor.lineCount();
    editor.destroy();
    panel.remove();
    finish({ saved, run, text: savedText, lines });
  };
  const actions = {
    save: () => void write(),
    run: () => write() && close(true),
    exit() {
      if (!modified() || confirming) return close(false);
      confirming = true;
      message.textContent = "Unsaved changes: Esc again to discard, ^S to save.";
    },
  };
  const keys = { "Mod-s": actions.save, Escape: actions.exit };
  if (canRun) keys["Mod-Enter"] = actions.run;

  const button = (action, text) => {
    const node = el("button", "", text);
    node.type = "button";
    node.addEventListener("click", () => {
      actions[action]();
      if (panel.isConnected) editor.focus();
    });
    keysRow.append(node);
  };
  button("save", "^S save");
  if (canRun) button("run", "^Enter save+run");
  button("exit", "Esc exit");
  keysRow.append(message);

  try {
    const { createEditor } = await import("./vendor/codemirror.js");
    const dark = getComputedStyle(document.documentElement).colorScheme !== "light";
    editor = createEditor({ parent: body, doc: content, language, dark, keys, onChange: refresh });
  } catch (err) {
    console.warn("md-term: editor bundle unavailable, using a plain text area", err);
    editor = plainEditor(body, content, keys, refresh);
  }
  refresh();
  panel.scrollIntoView({ block: "nearest" });
  editor.focus();
  return closed;
}
