---
error: "TS18046: 'error' is of type 'unknown'."
error_full: |
  src/api.ts:12:17 - error TS18046: 'error' is of type 'unknown'.

  12     console.log(error.message);
                     ~~~~~
cat: javascript
description: "TypeScript types `catch` variables (and some other values) as `unknown`, so you can't access properties on them until you narrow the type. It's on by default with `strict` since TypeScript 4.4 (`useUnknownInCatchVariables`)."
tldr: "Narrow before use: `if (error instanceof Error) console.log(error.message); else console.log(String(error));`. For other values use type guards (`typeof x === 'string'`, `'prop' in x`) or validate with a schema (zod). Avoid `catch (e: any)` except as a quick escape hatch."
keywords: typescript ts18046 is of type unknown error catch clause variable useunknownincatchvariables instanceof error narrowing type guard error.message unknown object strict
related: [js-ts2339-property-does-not-exist-on-type, js-ts2532-object-is-possibly-undefined, js-ts2322-type-is-not-assignable-to-type]
---
## What it means

`unknown` is the type-safe version of `any`: a value could be anything, so TypeScript lets you do almost nothing with it until you prove what it is. In JavaScript you can `throw` any value (`throw "oops"`, `throw 42`), so a caught value isn't guaranteed to be an `Error`. Since TS 4.4, `strict: true` enables `useUnknownInCatchVariables`, making `catch (error)` an `unknown` instead of `any`.

The same error appears for any `unknown` value: `JSON.parse` results passed through generic helpers, `fetch().json()` assigned to `unknown`, or library callbacks typed as `unknown`.

## Fix 1: narrow with instanceof Error

```ts
try {
  await save();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error', error);
  }
}
```

A reusable helper keeps catch blocks short:

```ts
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}
```

## Fix 2: library-specific error types

Many libraries export a guard or class:

```ts
import axios from 'axios';

try {
  await axios.get('/api/users');
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.log(error.response?.status, error.message);
  }
}
```

Prisma has `Prisma.PrismaClientKnownRequestError`, Zod has `ZodError` — use `instanceof` with them.

## Fix 3: narrowing other unknown values

```ts
function handle(data: unknown) {
  if (typeof data === 'string') return data.toUpperCase();
  if (typeof data === 'object' && data !== null && 'id' in data) {
    return (data as { id: unknown }).id;
  }
}
```

For anything non-trivial (API responses, parsed JSON), validate with a schema so the type and the runtime check can't drift:

```ts
import { z } from 'zod';
const User = z.object({ id: z.number(), name: z.string() });
const user = User.parse(await res.json());   // typed as { id: number; name: string }
```

## Fix 4: type assertion (when you're sure)

```ts
try { run(); } catch (error) {
  const e = error as Error;
  console.log(e.message);
}
```

This compiles but checks nothing at runtime — if a string is thrown, `e.message` is `undefined`. Prefer Fix 1.

Note you can't annotate the catch variable with a specific type: `catch (e: Error)` is a compile error (TS1196). Only `any` or `unknown` are allowed.

## Fix 5: restore the old behaviour (not recommended)

```ts
try { run(); } catch (error: any) { console.log(error.message); }
```

or project-wide in `tsconfig.json`:

```json
{ "compilerOptions": { "strict": true, "useUnknownInCatchVariables": false } }
```

This silences the error everywhere and brings back crashes like `Cannot read properties of undefined (reading 'message')` when a non-Error is thrown.

## Promise .catch()

In `.catch((err) => ...)` the parameter is typed `any`, not `unknown`, so you don't get TS18046 there. With `@typescript-eslint/use-unknown-in-catch-callback-variable` you can make it consistent and narrow the same way.
