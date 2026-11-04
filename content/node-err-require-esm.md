---
error: "Error [ERR_REQUIRE_ESM]: require() of ES Module not supported"
error_full: |
  Error [ERR_REQUIRE_ESM]: require() of ES Module /app/node_modules/node-fetch/src/index.js from /app/index.js not supported.
  Instead change the require of index.js in /app/index.js to a dynamic import() which is available in all CommonJS modules.
cat: npm
description: "Your CommonJS code calls `require()` on a package that is ESM-only (node-fetch 3, chalk 5, nanoid 4, got 12, p-limit 4 and others). Use `import`, a dynamic `import()`, the last CommonJS version of the package, or Node 22.12+ which can require most ES modules."
tldr: "Quickest: install the last CommonJS version (`npm i node-fetch@2`, `chalk@4`, `nanoid@3`). Proper fix: switch your project to ESM (`\"type\": \"module\"` in package.json and `import x from 'pkg'`), or use `const { default: fetch } = await import('node-fetch')` inside an async function. Node 22.12+ / 20.19+ supports `require()` of ESM without top-level await."
keywords: err_require_esm require of es module not supported node-fetch chalk nanoid esm only commonjs dynamic import type module typescript ts-node jest
related: [node-cannot-use-import-statement-outside-a-module, node-err-module-not-found, js-require-is-not-defined]
---
## What it means

Node has two module systems: CommonJS (`require`, `module.exports`) and ES modules (`import`, `export`). Many popular packages dropped CommonJS in recent major versions. Older Node versions can't load an ES module with `require()`, so they throw `ERR_REQUIRE_ESM`.

The path in the message tells you which package is ESM-only and which of your files is requiring it.

## Fix 1: pin the last CommonJS version

Fastest if you don't want to touch your module setup:

| Package | Last CJS version |
|---|---|
| node-fetch | 2.x (`npm i node-fetch@2`) |
| chalk | 4.x |
| nanoid | 3.x |
| got | 11.x |
| p-limit | 3.x |
| ora | 5.x |
| inquirer | 8.x |

For `node-fetch`, on Node 18+ you can drop the package entirely and use the built-in global `fetch`.

## Fix 2: use dynamic `import()` from CommonJS

`import()` works in CommonJS files and returns a promise:

```js
// index.js (CommonJS)
async function main() {
  const { default: chalk } = await import('chalk');
  console.log(chalk.green('ok'));
}
main();
```

Note the `default` for packages with a default export.

## Fix 3: convert your project to ESM

In `package.json`:

```json
{
  "type": "module"
}
```

Then replace `require`/`module.exports`:

```js
import fetch from 'node-fetch';
import { readFile } from 'node:fs/promises';
import config from './config.js';     // relative imports need the extension
export function handler() {}
```

`__dirname` isn't defined in ESM; use `import.meta.dirname` (Node 20.11+) or `path.dirname(fileURLToPath(import.meta.url))`. Alternatively rename only some files to `.mjs`.

## Fix 4: upgrade Node

Node 22.12+ and 20.19+ allow `require()` of ES modules by default, as long as the module doesn't use top-level `await`. Check with `node -v`. On older 22.x you could enable it with `--experimental-require-module`.

## TypeScript compiles imports to require()

If you write `import chalk from 'chalk'` in TypeScript but get `ERR_REQUIRE_ESM` at runtime, `tsc` is emitting CommonJS. Either:

- emit ESM: set `"module": "NodeNext"`, `"moduleResolution": "NodeNext"` in `tsconfig.json` and `"type": "module"` in package.json, or
- keep CommonJS and pin the CJS version of the dependency.

With `ts-node`, use `node --loader ts-node/esm` or switch to `tsx`, which handles both formats.

## Jest

Jest's default CommonJS transform can't load ESM-only packages in `node_modules`. Options: pin the CJS version, add the package to `transformIgnorePatterns` exceptions so Babel transforms it, e.g. `"transformIgnorePatterns": ["node_modules/(?!(chalk|nanoid)/)"]`, or move to Vitest which is ESM-native.
