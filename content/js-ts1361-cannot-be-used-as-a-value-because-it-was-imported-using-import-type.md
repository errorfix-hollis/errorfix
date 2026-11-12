---
error: "error TS1361: cannot be used as a value because it was imported using 'import type'."
error_full: |
  src/app.ts:5:15 - error TS1361: 'User' cannot be used as a value because it was imported using 'import type'.

  5 const u = new User("ann");
                  ~~~~

    src/app.ts:1:15
      1 import type { User } from "./models";
                      ~~~~
      'User' was imported here.
cat: javascript
description: "You imported something with import type (which is erased at compile time) but then used it at runtime, e.g. with new, instanceof, as an enum value or as a function. Import it as a normal value instead."
tldr: "Change `import type { User } from \"./models\"` to `import { User } from \"./models\"` (or mix: `import { User, type UserProps } from \"./models\"`). If an ESLint auto-fix or IDE added `type`, it misjudged usage; re-run with the correct import. TS1362 is the same error for `export type`."
keywords: typescript error ts1361 cannot be used as a value because it was imported using import type ts1362 exported using export type instanceof new enum class verbatimmodulesyntax consistent-type-imports
related: [js-ts1484-is-a-type-and-must-be-imported-using-a-type-only-import, js-ts2304-cannot-find-name, js-ts2339-property-does-not-exist-on-type]
---
## What it means

`import type` imports **only the type side** of a name. The whole statement is deleted from the JavaScript output, so at runtime the name doesn't exist. Using it in a value position would crash, so TypeScript stops you:

```ts
import type { User, Role } from "./models";

const u = new User("ann");          // TS1361: class constructor used as value
if (x instanceof User) {}           // TS1361
const r = Role.Admin;               // TS1361: enum used as value
```

Pure type positions are fine: `let u: User`, `function f(r: Role)`, `User[]`, generics.

The companion error **TS1362** (*"cannot be used as a value because it was exported using 'export type'"*) means an intermediate file re-exported the name with `export type { User }`, so even a normal import only gets the type.

## Fix 1: use a regular import

```ts
import { User, Role } from "./models";
```

If you also import pure types from the same module, use inline `type` modifiers (TS 4.5+):

```ts
import { User, type UserProps, Role } from "./models";
```

This keeps type-only imports elided while `User` and `Role` stay runtime values. It works with [`verbatimModuleSyntax`](/javascript/js-ts1484-is-a-type-and-must-be-imported-using-a-type-only-import/) too.

## Fix 2: fix the re-export (TS1362)

Find the barrel file that does:

```ts
// models/index.ts
export type { User } from "./user";    // only the type is re-exported
```

and change it to a value export:

```ts
export { User } from "./user";
export type { UserProps } from "./user";
```

## Fix 3: a linter or IDE added `type` automatically

`@typescript-eslint/consistent-type-imports`, Biome's `useImportType`, or VS Code's *Organize imports* add `type` when a name is only used as a type at that moment. After you add `new User()` later, the import is wrong. Just remove `type`; the lint rule will accept it now that it's a value usage.

If the auto-fix keeps re-adding it, check for decorators: with `emitDecoratorMetadata` (NestJS, TypeORM, Angular DI) a class used only in a constructor parameter type **is** needed at runtime, but linters can't see that. Configure the rule:

```js
// eslint.config.js
rules: {
  "@typescript-eslint/consistent-type-imports": ["error", {
    fixStyle: "inline-type-imports"
  }]
}
```

and for decorator-heavy code consider `parserOptions.emitDecoratorMetadata: true` so the rule knows.

## Fix 4: you really only need the type

If you used the name as a value by mistake (e.g. `typeof` confusion), use a type position instead:

```ts
import type { Config } from "./config";

type C = Config;               // fine
const keys: (keyof Config)[] = ["port"];
```

Note `typeof User` in a *type* annotation is allowed with `import type`:

```ts
import type { User } from "./models";
function make(ctor: typeof User) { return new ctor("ann"); }  // OK: ctor is a value parameter
```
