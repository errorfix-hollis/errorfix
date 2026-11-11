---
error: "TS1484: 'X' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled."
error_full: |
  error TS1484: 'User' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.

  1 import { User, getUser } from './api';
             ~~~~
cat: javascript
description: "With verbatimModuleSyntax on, TypeScript keeps every import that isn't marked as type-only, so importing a type with a normal import would leave a runtime import of something that doesn't exist. Vite, Angular and SvelteKit templates enable this flag by default."
tldr: "Mark type imports with `type`: `import type { User } from './api'` or inline `import { type User, getUser } from './api'`. Auto-fix all files with ESLint's `@typescript-eslint/consistent-type-imports` rule (`npx eslint . --fix`). Only as a last resort, set `\"verbatimModuleSyntax\": false` in tsconfig.json."
keywords: typescript ts1484 is a type and must be imported using a type-only import verbatimmodulesyntax import type vite tsconfig isolatedmodules consistent-type-imports
related: [js-ts2307-cannot-find-module-or-its-corresponding-type-declarations, js-requested-module-does-not-provide-an-export-named, js-ts2304-cannot-find-name]
---
## What it means

Types (interfaces, type aliases) only exist at compile time. When TypeScript compiles

```ts
import { User, getUser } from './api';
```

it must decide whether to keep the import in the JavaScript output. Traditionally TypeScript silently dropped imports that were only used as types ("import elision"). Tools that compile one file at a time (esbuild in Vite, SWC, Babel) can't know whether `User` is a type, which led to runtime errors like `The requested module does not provide an export named 'User'`.

The `verbatimModuleSyntax` option (TypeScript 5.0+) removes the guessing: **imports without the `type` modifier are always kept, imports with it are always removed.** TS1484 is the compiler telling you an import refers only to a type and therefore must be marked.

Projects created with `npm create vite@latest` (React/Vue TS templates) and recent Angular/SvelteKit versions enable it in `tsconfig.app.json`, so the error often appears right after copying code from older projects.

## Fix 1: use import type

For an import that contains only types:

```ts
import type { User, Role } from './api';
```

For a mix of values and types, mark each type inline:

```ts
import { getUser, type User } from './api';
```

The same applies to re-exports, which give the sibling error TS1205:

```ts
export type { User } from './api';
```

## Fix 2: fix every file automatically

With typescript-eslint, enable the rule and run `--fix`:

```js
// eslint.config.js
rules: {
  '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
}
```

```bash
npx eslint . --fix
```

In VS Code, the quick fix (Ctrl+. on the error) offers "Use 'import type'" and "Fix all in file". Biome users can run `npx @biomejs/biome lint --write .` with the `useImportType` rule.

## Fix 3: enums and classes are values

`enum` and `class` exist at runtime, so they must **not** use `import type` if you use them as values:

```ts
import { Status } from './types';     // enum used as Status.Active: keep a normal import
import type { Status } from './types'; // only if used purely in type positions
```

If you get TS1361 (`cannot be used as a value because it was imported using 'import type'`), you went too far: remove `type` for that name.

`const enum` doesn't work across files with `isolatedModules`/`verbatimModuleSyntax`; replace it with a regular `enum` or an object `as const`.

## Fix 4: turn the option off (not recommended)

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": false
  }
}
```

If your bundler compiles files in isolation (Vite, esbuild, SWC), keep `"isolatedModules": true` so you still get warned about patterns they can't handle. Marking type imports explicitly is the better long-term fix, since it makes builds faster and output predictable.

## CommonJS note

With `verbatimModuleSyntax`, `import`/`export` syntax in a file that compiles to CommonJS is an error (TS1286/TS1287). In CJS projects either use `"module": "nodenext"` with `"type": "module"` in package.json, or write `import fs = require('fs')` style imports.
