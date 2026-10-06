// The editor behind md-term's `edit` command: CodeMirror 6 behind a tiny API,
// bundled into src/md_term/assets/js/vendor/codemirror.js.
//
// Colors are not set here. Tokens get `tok-*` classes (classHighlighter) and
// the editor's parts keep their `cm-*` classes; term.css styles both from the
// theme's variables, so the editor follows `theme` like everything else.

import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { basicSetup } from "codemirror";

// `keys` maps CodeMirror key names ("Mod-s", "Escape") to callbacks. Mod-* keys
// win over everything; the others run only when CodeMirror has no use for the
// key itself, so Escape still closes a completion popup first.
export function createEditor({ parent, doc = "", language = "", dark = true, keys = {}, onChange }) {
  const binding = ([key, run]) => ({
    key,
    preventDefault: true,
    run() {
      run();
      return true;
    },
  });
  const entries = Object.entries(keys);
  const extensions = [
    Prec.highest(keymap.of(entries.filter(([key]) => key.startsWith("Mod-")).map(binding))),
    basicSetup,
    keymap.of([indentWithTab, ...entries.filter(([key]) => !key.startsWith("Mod-")).map(binding)]),
    indentUnit.of("    "),
    syntaxHighlighting(classHighlighter),
    EditorView.lineWrapping,
    EditorView.theme({}, { dark }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange?.();
    }),
  ];
  if (language === "python") extensions.push(python());
  const view = new EditorView({ state: EditorState.create({ doc, extensions }), parent });
  return {
    getValue: () => view.state.doc.toString(),
    lineCount: () => view.state.doc.lines,
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
