---
error: "error TS2304: Cannot find name"
error_full: |
  src/index.ts:3:1 - error TS2304: Cannot find name 'process'.
  error TS2304: Cannot find name 'describe'.
  error TS2304: Cannot find name 'document'.
  error TS2580: Cannot find name 'require'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node`.
cat: javascript
description: "TypeScript doesn't know a global name: either a missing type package (@types/node, @types/jest), a missing lib in tsconfig (dom, es2020), a tsconfig 'types' list that excludes it, or a plain typo/missing import."
tldr: "Install the types for the environment: `npm i -D @types/node` (process, require, Buffer) or `@types/jest`/`vitest/globals` (describe, it, expect). For browser globals add \"dom\" to `compilerOptions.lib`. If tsconfig has a `types` array, add the package there. For your own identifiers, add the missing import or `declare` it."
keywords: typescript error ts2304 cannot find name process require describe document window ts2580 ts2582 @types/node @types/jest tsconfig lib dom types array
related: [js-ts2307-cannot-find-module-or-its-corresponding-type-declarations, js-ts2339-property-does-not-exist-on-type, js-ts7016-could-not-find-a-declaration-file-for-module]
---
## What it means

TS2304 means an identifier is used but TypeScript can't find any declaration for it in scope: no local variable, no import, no global from a `.d.ts` file. The code might even run fine (Node does have `process`), but the type checker has no declaration.

Related codes: **TS2580** (`Cannot find name 'require'`/`'process'`... *Do you need to install type definitions for node?*), **TS2582** (same for test globals like `describe`), and **TS2583/TS2584** (*Do you need to change your target library?*). The fixes are the same.

## Cause 1: Node globals without @types/node

`process`, `require`, `module`, `__dirname`, `Buffer`, `setImmediate`, `NodeJS.Timeout`:

```bash
npm install --save-dev @types/node
```

Then restart the TS server in your editor (VS Code: *TypeScript: Restart TS Server*).

## Cause 2: test globals (describe, it, expect, jest)

```bash
npm install --save-dev @types/jest        # Jest
npm install --save-dev @types/mocha       # Mocha
```

For Vitest with `globals: true`, add the types in tsconfig:

```json
{ "compilerOptions": { "types": ["vitest/globals"] } }
```

Or import them explicitly: `import { describe, it, expect } from 'vitest'`.

## Cause 3: a `types` array that filters them out

If `tsconfig.json` has `compilerOptions.types`, **only** the listed `@types` packages are loaded automatically. Installing `@types/node` does nothing until it's listed:

```json
{
  "compilerOptions": {
    "types": ["node", "jest"]
  }
}
```

Remove the `types` option to load every `@types/*` package, or list what you need. Also check the right tsconfig applies to the file: test files are often excluded by `include`/`exclude`, or covered by a separate `tsconfig.spec.json`.

## Cause 4: browser or newer JS globals missing from `lib`

`document`, `window`, `HTMLElement`, `fetch` come from the `dom` lib; `Promise`, `Map`, `Object.entries`, `Array.prototype.includes` and others come from ES libs. If you set `lib` explicitly, include what you use:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

Omitting `lib` entirely gives you the defaults for your `target`, including DOM.

## Cause 5: your own name is undeclared

- A typo or wrong case (`useState` vs `UseState`).
- A missing import: `import { useState } from 'react'`.
- A global injected at build time (Vite `import.meta.env` is fine, but `__APP_VERSION__` from `define` isn't known). Declare it in a `.d.ts` file included by tsconfig:

```ts
// src/globals.d.ts
declare const __APP_VERSION__: string;
```

- A global from a `<script>` tag (e.g. `gtag`, `google`): install its types (`@types/gtag.js`, `@types/google.maps`) or declare it as above.

## Cause 6: `Cannot find name 'React'` in JSX files

With the new JSX transform set `"jsx": "react-jsx"` in tsconfig instead of `"react"`, so you don't need `import React` in every file.
