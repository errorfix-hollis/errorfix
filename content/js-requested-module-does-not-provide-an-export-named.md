---
error: "SyntaxError: The requested module does not provide an export named"
error_full: |
  Uncaught SyntaxError: The requested module '/src/utils.js' does not provide an export named 'default'
  SyntaxError: Named export 'merge' not found. The requested module 'lodash' is a CommonJS module, which may not support all module.exports as named exports.
cat: javascript
description: "An ES module import asked for a name the target module doesn't export: a default vs named mismatch, a typo, a type-only export, or a CommonJS package whose exports can't be detected as named ESM exports."
tldr: "Match the import to the export: `export default x` needs `import x from`, `export const x` needs `import { x } from`. For CommonJS packages in Node, use `import pkg from 'pkg'; const { merge } = pkg;`. For TypeScript types use `import type`. In Vite, add CJS deps to `optimizeDeps.include` and restart with `--force`."
keywords: syntaxerror the requested module does not provide an export named default named export not found commonjs module esm import type vite optimizedeps node es modules
related: [node-cannot-use-import-statement-outside-a-module, node-err-require-esm, js-vite-failed-to-resolve-import]
---
## What it means

ES module imports are checked **when the module graph is linked**, before any code runs. If `import { x } from './a.js'` and `a.js` has no export named `x`, the browser or Node throws this `SyntaxError` and nothing in that module executes.

The message comes from the browser (and Vite in dev, which serves native ESM) or from Node's ESM loader. Node adds the "is a CommonJS module" hint when the target is CJS.

## Cause 1: default vs named mismatch

```js
// utils.js
export function slugify(s) { ... }

// app.js
import slugify from './utils.js';   // no export named 'default'
```

Fix the import to match the export (or vice versa):

```js
import { slugify } from './utils.js';
```

And the opposite: `export default App` must be imported as `import App from './App.jsx'`, not `import { App }`. Check spelling and case too — `{ useFetch }` vs `{ UseFetch }`.

## Cause 2: TypeScript types imported as values

```ts
// types.ts
export interface User { id: string }
// app.ts
import { User } from './types';
```

Interfaces and type aliases are erased at compile time. Tools that transpile file-by-file (Vite/esbuild, swc, Babel) can't always tell it's a type, so the runtime import of `User` fails. Use type-only imports:

```ts
import type { User } from './types';
import { type User, createUser } from './users';
```

Enable `"verbatimModuleSyntax": true` (or `isolatedModules`) in `tsconfig.json` so the compiler flags these for you.

## Cause 3: CommonJS package imported with named imports (Node)

```js
import { merge } from 'lodash';
// SyntaxError: Named export 'merge' not found. The requested module 'lodash' is a CommonJS module...
```

Node detects named exports of CJS modules by static analysis, which fails for packages that build `module.exports` dynamically. Import the default (which is `module.exports`) and destructure:

```js
import lodash from 'lodash';
const { merge } = lodash;
```

Or use a package with real ESM builds (`lodash-es`), or `createRequire`:

```js
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { merge } = require('lodash');
```

## Cause 4: Vite dependency pre-bundling

In Vite dev, CJS dependencies are converted to ESM by pre-bundling. If a dependency is linked locally, excluded, or imported in a way Vite didn't discover, you can get this error in the browser for a package that works in the production build. Add it to `vite.config.js`:

```js
export default {
  optimizeDeps: { include: ['some-cjs-package'] },
};
```

Then restart with a fresh cache: `npx vite --force` (or delete `node_modules/.vite`).

## Cause 5: export renamed or removed in a new version

After upgrading a library, an export may have moved (e.g. from the package root to a subpath like `pkg/server`). Check the package's changelog, and look at what it actually exports:

```bash
node -e "import('some-pkg').then(m => console.log(Object.keys(m)))"
```

## Cause 6: circular imports with `export *`

Re-export barrels (`index.js` with `export * from './a'`) combined with circular imports can make a name unavailable at link time, or two `export *` sources export the same name (which makes it ambiguous and silently not exported). Import directly from the source file to check, and break the cycle.
