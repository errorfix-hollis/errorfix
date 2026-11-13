---
error: "TS1259: Module can only be default-imported using the 'esModuleInterop' flag"
error_full: |
  error TS1259: Module '"/app/node_modules/@types/express/index"' can only be default-imported using the 'esModuleInterop' flag

  1 import express from "express";
           ~~~~~~~

    node_modules/@types/express/index.d.ts:133:1
      133 export = e;
          ~~~~~~~~~~~
      This module is declared with 'export =', and can only be used with a default import when using the 'esModuleInterop' flag.
cat: javascript
description: "You wrote a default import (import x from \"pkg\") for a CommonJS package whose types use export =. TypeScript only allows that when esModuleInterop (or allowSyntheticDefaultImports) is enabled."
tldr: "Add `\"esModuleInterop\": true` to `compilerOptions` in tsconfig.json (it also enables `allowSyntheticDefaultImports`). Or, without changing config, use `import express = require(\"express\")` or `import * as express from \"express\"`. Make sure the tsconfig you edit is the one actually used."
keywords: typescript ts1259 can only be default-imported using the esmoduleinterop flag export = allowsyntheticdefaultimports tsconfig import express from express react commonjs default import
related: [js-ts2307-cannot-find-module-or-its-corresponding-type-declarations, js-ts7016-could-not-find-a-declaration-file-for-module, js-ts1286-esm-syntax-is-not-allowed-in-a-commonjs-module]
---
## What it means

Many CommonJS packages (`express`, `react` types before v19, `lodash`, `moment`, `cors`...) are typed with `export = something`. Strictly, such a module has **no** default export, so `import express from "express"` is not valid unless TypeScript is told to synthesize one.

`esModuleInterop` does two things:

1. Type-checking: allows default imports of `export =` modules (via `allowSyntheticDefaultImports`).
2. Emit: adds `__importDefault` / `__importStar` helpers so the import works at runtime in CommonJS output.

## Fix 1: enable esModuleInterop (recommended)

```json
{
  "compilerOptions": {
    "esModuleInterop": true
  }
}
```

This is the default in `tsc --init` configs and what most projects use. Restart your editor's TS server afterwards (VS Code: *TypeScript: Restart TS Server*).

If a bundler (Vite, webpack, esbuild) emits the JS and `tsc` only type-checks, `"allowSyntheticDefaultImports": true` is enough. It's also implied by `"module": "system"`, `"moduleResolution": "bundler"` and `"esModuleInterop": true`.

## Fix 2: use import syntax that matches export =

Without changing config:

```ts
import express = require("express");    // works with module: commonjs
const app = express();
```

or a namespace import, for modules you don't call directly:

```ts
import * as path from "path";
```

Note: `import * as express from "express"; express()` type-checks only without `esModuleInterop`, and calling a namespace object is invalid in real ESM. Prefer Fix 1.

## Fix 3: the setting is in the wrong tsconfig

You set the flag, but the error remains:

- Monorepos and frameworks use several configs (`tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.build.json`). Check which one includes the failing file.
- `extends` is overridden by a later `compilerOptions` value.
- Running `tsc file.ts` with a file name **ignores tsconfig.json** entirely. Run `tsc -p .` or `npx tsc --noEmit`.
- ts-node / Jest may use their own config; pass it explicitly (`ts-jest` reads `tsconfig` option).

Print the effective config:

```bash
npx tsc --showConfig | grep -i interop
```

## Fix 4: check @types and the module setting

`"module": "node16"`, `"nodenext"` and `"preserve"` turn `esModuleInterop` on by default, so the error normally disappears with those settings. If it persists, an explicit `"esModuleInterop": false` somewhere in the `extends` chain may be overriding it, or outdated type packages may be involved — update them (`npm i -D @types/express@latest`).

## Runtime symptom of the same problem

If you silence the type error some other way (e.g. `// @ts-ignore`) without `esModuleInterop`, compiled CommonJS code calls `express_1.default()`, which crashes with `TypeError: (0 , express_1.default) is not a function`. Enabling `esModuleInterop` fixes both.
