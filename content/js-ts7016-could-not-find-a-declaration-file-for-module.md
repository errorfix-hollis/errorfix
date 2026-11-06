---
error: "TS7016: Could not find a declaration file for module"
error_full: |
  error TS7016: Could not find a declaration file for module 'lodash'. '/home/me/app/node_modules/lodash/index.js' implicitly has an 'any' type.
    Try `npm i --save-dev @types/lodash` if it exists or add a new declaration (.d.ts) file containing `declare module 'lodash';`
cat: javascript
description: The package is installed and its JavaScript was found, but it ships no TypeScript types and there is no @types package installed, so with noImplicitAny on TypeScript refuses to treat it as any.
tldr: "Install the community types: `npm i -D @types/<package>` (for scoped packages `@scope/pkg` use `@types/scope__pkg`). If none exist, create `src/types/<package>.d.ts` with `declare module '<package>';` and make sure that folder is included by tsconfig.json."
keywords: typescript ts7016 could not find a declaration file for module implicitly has an any type @types declare module d.ts noimplicitany typeroots
related: [js-ts2307-cannot-find-module-or-its-corresponding-type-declarations, js-module-not-found-error-cant-resolve, node-cannot-find-module]
---
## What it means

TypeScript resolved the import to a real `.js` file in `node_modules`, but couldn't find any type information for it:

- the package has no `types`/`typings` field and no `.d.ts` files, and
- there is no matching `@types/...` package installed.

Because `noImplicitAny` is on (it is with `"strict": true`), TypeScript won't silently type the module as `any`, so it raises TS7016. This is different from TS2307, where the module itself can't be found.

## Fix 1: install the @types package

Most popular JS-only libraries have community types in DefinitelyTyped:

```bash
npm i -D @types/lodash
npm i -D @types/express @types/node
yarn add -D @types/lodash
pnpm add -D @types/lodash
```

For scoped packages the name is flattened with a double underscore:

```bash
# @babel/core -> @types/babel__core
npm i -D @types/babel__core
```

Check whether types exist with `npm view @types/<name> version`. If it returns a 404, there are none.

Also check that the library hasn't started bundling its own types in a newer version — upgrading the package itself may fix it, and then you should remove the outdated `@types` package.

## Fix 2: write a declaration

If no types exist, declare the module yourself. Create e.g. `src/types/untyped-lib.d.ts`:

```ts
// Shorthand: everything imported from it is `any`
declare module "untyped-lib";
```

Or describe the parts you use, which gives you real type checking:

```ts
declare module "untyped-lib" {
  export function slugify(input: string, sep?: string): string;
  const version: string;
  export default version;
}
```

The file must **not** contain a top-level `import`/`export` outside the `declare module` block — that turns it into a module and the declaration no longer applies globally. Put imports inside the `declare module` block if you need them.

## Fix 3: make sure tsconfig includes the .d.ts file

If you added a declaration and still get TS7016, TypeScript probably isn't reading the file. Check `tsconfig.json`:

```json
{
  "compilerOptions": { "strict": true },
  "include": ["src", "types"]
}
```

Files outside `include` are ignored. If you set `typeRoots`, remember it replaces the default `node_modules/@types`:

```json
"typeRoots": ["./node_modules/@types", "./types"]
```

Restart the TypeScript server in your editor afterwards (VS Code: Command Palette → "TypeScript: Restart TS Server").

## Fix 4: package has types, but `exports` hides them

With `"moduleResolution": "node16"`, `"nodenext"` or `"bundler"`, TypeScript follows the package's `exports` map. If the package lists types only under the legacy `types` field, or only for `import` and not `require`, you can get TS7016 even though `.d.ts` files exist. Options:

- upgrade the package (many fixed their `exports` "types" conditions),
- import the path that has types,
- or temporarily use `"moduleResolution": "node"` if that matches your toolchain.

`npx @arethetypeswrong/cli <package>` diagnoses these packaging problems.

## Fix 5 (last resort): turn off the check

Setting `"noImplicitAny": false` makes TS7016 disappear for all modules but also weakens type checking across your whole codebase. A one-line `declare module "x";` is a far smaller hole.

## JavaScript files with checkJs

In a JS project using `// @ts-check` or `"checkJs": true`, the same error appears in the editor. The fixes are identical: install `@types/...` or add a `.d.ts` file to the project.
