---
error: "error TS1286: ESM syntax is not allowed in a CommonJS module when 'verbatimModuleSyntax' is enabled."
error_full: |
  src/index.ts:1:1 - error TS1286: ESM syntax is not allowed in a CommonJS module when 'verbatimModuleSyntax' is enabled.

  1 import express from "express";
    ~~~~~~
cat: javascript
description: "With verbatimModuleSyntax on, TypeScript emits imports exactly as written, so it refuses import/export in files it treats as CommonJS (no \"type\": \"module\" in package.json, or a .cts file). Make the file ESM or turn the option off."
tldr: "If the project should be ESM, add `\"type\": \"module\"` to package.json (with `\"module\": \"NodeNext\"` in tsconfig) or rename the file to `.mts`. If it should stay CommonJS, set `\"verbatimModuleSyntax\": false` in tsconfig (or use `import x = require(\"x\")` / `export =` syntax)."
keywords: typescript error ts1286 esm syntax is not allowed in a commonjs module verbatimmodulesyntax type module package.json nodenext commonjs mts cts ts1287
related: [js-ts1484-is-a-type-and-must-be-imported-using-a-type-only-import, node-cannot-use-import-statement-outside-a-module, node-err-require-esm]
---
## What it means

`verbatimModuleSyntax` (TypeScript 5.0+) tells the compiler: *don't rewrite my imports and exports, emit them as written* (only `import type` is dropped). That's only possible if the output format matches the source syntax.

When `module` is `NodeNext`/`Node16`, TypeScript decides per file whether it's ESM or CommonJS, the same way Node does:

- `.mts` / `.mjs` → ESM
- `.cts` / `.cjs` → CommonJS
- `.ts` / `.js` → ESM if the nearest `package.json` has `"type": "module"`, otherwise **CommonJS**

If a file is CommonJS and contains `import ... from` or `export`, TypeScript would have to convert it to `require()`, which `verbatimModuleSyntax` forbids. So you get TS1286. (`module: "commonjs"` with the flag on gives the same error for every file.)

The sibling error **TS1287** says *"A top-level 'export' modifier cannot be used on value declarations in a CommonJS module"*, same cause, same fixes.

## Fix 1: make the project ESM (recommended for new code)

```json
// package.json
{
  "type": "module"
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "verbatimModuleSyntax": true
  }
}
```

In ESM, relative imports need file extensions in the source, written as `.js` even though the file is `.ts`:

```ts
import { helper } from "./helper.js";
```

Also replace `__dirname` with `import.meta.dirname` (Node 20.11+) and `require()` with `import`.

## Fix 2: make just one file ESM

Rename it to `.mts`. Its output becomes `.mjs`, which Node always runs as ESM, without changing the rest of the package.

## Fix 3: keep CommonJS, turn the flag off

If your package is intentionally CommonJS (older tooling, Jest without ESM, etc.), let TypeScript transform imports to `require()`:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "verbatimModuleSyntax": false,
    "esModuleInterop": true
  }
}
```

Many templates (e.g. `tsc --init` in TS 5.9+, Vite templates) turn `verbatimModuleSyntax` on by default, which is why this suddenly appears in new projects. If you turn it off and still want type-only imports enforced, keep using `import type` by convention or a lint rule (`@typescript-eslint/consistent-type-imports`).

## Fix 4: keep the flag and CommonJS, use CJS syntax

TypeScript's CommonJS-shaped syntax is allowed with the flag on:

```ts
import express = require("express");
import type { Request } from "express";

const app = express();
export = app;
```

This is rarely worth it outside of declaration-heavy library code.

## Fix 5: a bundler handles modules

If Vite, esbuild, tsup or Next.js does the bundling and `tsc` only type-checks, use:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  }
}
```

With `module: "ESNext"` every file is ESM, so TS1286 can't occur.

## Check how TypeScript sees a file

```bash
npx tsc --explainFiles | grep -A2 "src/index.ts"
```

It prints lines like *"File is CommonJS module because 'package.json' does not have field "type""*, which tells you exactly which rule applied.
