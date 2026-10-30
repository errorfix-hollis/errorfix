---
error: "TS2307: Cannot find module or its corresponding type declarations."
error_full: |
  error TS2307: Cannot find module 'lodash' or its corresponding type declarations.
  error TS2307: Cannot find module './styles.module.css' or its corresponding type declarations.
  error TS2307: Cannot find module '@/components/Button' or its corresponding type declarations.
cat: javascript
description: The TypeScript compiler can't resolve an import to a file or a type declaration. The package is missing, it ships no types, the file type isn't declared, or a path alias isn't configured.
tldr: "Install the package (`npm install lodash`) and its types if needed (`npm install -D @types/lodash`). For CSS/SVG/image imports add a `declare module '*.css';` file. For aliases like `@/` set `baseUrl`/`paths` in tsconfig.json. Then restart the TS server in your editor."
keywords: typescript ts2307 cannot find module or its corresponding type declarations @types paths alias baseUrl css module svg declare module moduleResolution
related: [node-cannot-find-module, node-err-module-not-found, js-require-is-not-defined]
---
## What it means

`tsc` (or your editor's TypeScript server) tried to resolve the import specifier and found neither a `.ts`/`.tsx`/`.d.ts` file nor a JavaScript package with types. Work out which kind of import it is.

## Cause 1: the package isn't installed

```bash
npm ls lodash          # is it there?
npm install lodash
```

In monorepos, make sure it's installed in the workspace that imports it.

## Cause 2: the package ships no types

Many packages publish types separately on DefinitelyTyped:

```bash
npm install -D @types/lodash
npm install -D @types/node        # for 'fs', 'path', etc.
```

If no `@types` package exists, declare the module yourself in a `.d.ts` file that is included by your tsconfig (e.g. `src/types/shims.d.ts`):

```ts
declare module 'some-untyped-lib';
```

This makes the import type `any`.

## Cause 3: non-code files (CSS, SVG, images)

TypeScript doesn't know what importing `.css` or `.svg` returns. Add declarations:

```ts
// src/global.d.ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.css';
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
```

Vite projects get these from `/// <reference types="vite/client" />` (usually in `src/vite-env.d.ts`); Next.js from `next-env.d.ts`. Don't delete those files.

## Cause 4: path alias not configured

Imports like `@/components/Button` need `paths` in tsconfig.json:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

`paths` only affects type checking. Your bundler or runtime needs the same alias (Vite `resolve.alias`, webpack `resolve.alias`, or `tsconfig-paths` for ts-node).

## Cause 5: wrong moduleResolution for the package

Packages that only expose files through `"exports"` in package.json may fail with the old `"moduleResolution": "node"` (node10). Use a modern setting:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

For Node.js projects run directly by Node, use `"module": "NodeNext"` (which implies `"moduleResolution": "NodeNext"`). With NodeNext, relative imports need the `.js` extension: `import { x } from './util.js'`.

## Cause 6: file not included / wrong path or case

- Check the relative path and capitalisation: `./button` vs `./Button` works on macOS/Windows but fails on Linux CI.
- Make sure the file is matched by `include` in tsconfig.json (e.g. `"include": ["src"]`).

## Cause 7: the editor is stale

After installing packages or editing tsconfig, VS Code may keep the old error. Run **TypeScript: Restart TS Server** from the command palette (Ctrl+Shift+P). Confirm with the CLI:

```bash
npx tsc --noEmit
```
