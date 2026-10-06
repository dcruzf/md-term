// Rebuilds the vendored Monty glue and its runtime.json. Run after bumping the
// @pydantic/monty version in package.json:  npm install && npm run build
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const pkg = "node_modules/@pydantic/monty";
const out = "../../src/md_term/runtimes/monty/";
const { version } = JSON.parse(readFileSync(here(`${pkg}/package.json`), "utf8"));

const common = { bundle: true, format: "esm", platform: "browser", minify: true, legalComments: "inline" };
await build({ ...common, entryPoints: [here("entry.js")], outfile: here(`${out}monty.js`) });
await build({
  ...common,
  entryPoints: [here(`${pkg}/dist/worker/browserWorkerEntry.js`)],
  outfile: here(`${out}monty.worker.js`),
  external: ["node:*"], // a Node-only branch of the generated component loader
});

// The .wasm files are too big to vendor: md-term downloads them from this
// tarball at build time and checks them against these hashes.
const { COMPONENT_MODULE_NAMES } = await import(here(`${pkg}/dist/worker/componentModules.js`));
const files = {};
for (const name of COMPONENT_MODULE_NAMES) {
  const member = `dist/worker/component/${name}`;
  const path = here(`${pkg}/${member}`);
  files[name] = {
    member: `package/${member}`,
    size: statSync(path).size,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  };
}
const runtime = {
  name: "monty",
  version,
  tarball: `https://registry.npmjs.org/@pydantic/monty/-/monty-${version}.tgz`,
  glue: ["monty.js", "monty.worker.js"],
  files,
};
writeFileSync(here(`${out}runtime.json`), JSON.stringify(runtime, null, 2) + "\n");
console.log(`monty ${version}: glue and runtime.json written to ${out}`);
