---
error: "TS2769: No overload matches this call."
error_full: |
  error TS2769: No overload matches this call.
    Overload 1 of 4, '(): Date', gave the following error.
      Expected 0 arguments, but got 1.
    Overload 2 of 4, '(value: string | number | Date): Date', gave the following error.
      Argument of type 'string | undefined' is not assignable to parameter of type 'string | number | Date'.
        Type 'undefined' is not assignable to type 'string | number | Date'.
cat: javascript
description: "The function you called has several overload signatures in its type definitions, and your arguments don't fit any of them. TypeScript shows why each overload failed; the useful detail is usually in the last or most specific one."
tldr: "Read the per-overload errors and find the one you meant to call; fix that argument's type (narrow `undefined` with a check, add a generic like `reduce<Record<string, number>>(...)`, or type the callback parameters). Don't silence it with `as any`."
keywords: typescript ts2769 no overload matches this call overload 1 of 2 gave the following error argument of type is not assignable reduce new date addEventListener react styled-components
related: [js-ts2345-argument-of-type-is-not-assignable-to-parameter, js-ts2322-type-is-not-assignable-to-type, js-ts2532-object-is-possibly-undefined]
---
## What it means

Many APIs declare more than one call signature (overloads): `new Date()`, `Array.prototype.reduce`, `addEventListener`, `fetch`, React's `useState`, `styled-components`, Express route handlers, Mongoose queries and so on. TypeScript tries each overload in order. If **none** accepts your arguments, you get TS2769, followed by the reason each overload rejected the call.

For a single-signature function the same mistake would be a plain [TS2345](/javascript/js-ts2345-argument-of-type-is-not-assignable-to-parameter/). So: pick the overload you intended, read *its* error, and fix that argument.

## Cause 1: a possibly-undefined value

```ts
const raw: string | undefined = process.env.START_DATE;
const d = new Date(raw);   // TS2769
```

Overload 2 says `'string | undefined' is not assignable to 'string | number | Date'`. Narrow it:

```ts
if (!raw) throw new Error("START_DATE is not set");
const d = new Date(raw);          // raw is string here
// or provide a default
const d2 = new Date(raw ?? Date.now());
```

Same with `parseInt(maybeString)`, `JSON.parse(localStorage.getItem("x"))` (returns `string | null`) and `setTimeout`/`setInterval` callbacks.

## Cause 2: `reduce` with an untyped initial value

```ts
const counts = words.reduce((acc, w) => {
  acc[w] = (acc[w] ?? 0) + 1;     // TS2769 / TS7053
  return acc;
}, {});
```

`{}` is inferred as type `{}`, which matches no overload. Give the accumulator type via the generic:

```ts
const counts = words.reduce<Record<string, number>>((acc, w) => {
  acc[w] = (acc[w] ?? 0) + 1;
  return acc;
}, {});
```

## Cause 3: callback parameters or return type don't match

```ts
window.addEventListener("keydown", (e: MouseEvent) => {});  // TS2769
```

`"keydown"` requires a `KeyboardEvent` listener. Use the right event type or let TypeScript infer it by omitting the annotation:

```ts
window.addEventListener("keydown", (e) => console.log(e.key));
```

For custom events, augment `WindowEventMap` (or `HTMLElementEventMap`) instead of casting.

## Cause 4: React props and styled components

A component with extra or wrongly typed props hits overloads from `React.createElement` / styled-components:

```tsx
const Button = styled.button<{ $primary?: boolean }>`
  color: ${(p) => (p.$primary ? "white" : "black")};
`;
<Button $primary>Save</Button>
```

Without the generic, passing `$primary` produces TS2769. Similarly, check `onChange` handlers: `(e: React.ChangeEvent<HTMLInputElement>) => void` for inputs, not `HTMLSelectElement`.

## Cause 5: Express / Node handlers

```ts
app.get("/user/:id", async (req: Request, res: Response) => { ... });
```

If `Request`/`Response` are imported from the wrong place (the DOM globals instead of `express`), no overload matches. Import them explicitly:

```ts
import express, { Request, Response } from "express";
```

Returning `res.json(...)` from a handler typed to return `void` can also fail with newer `@types/express`; use `res.json(...); return;`.

## Cause 6: mismatched library and @types versions

If the error appears after an upgrade in code you didn't change, `@types/*` may not match the library version (e.g. `@types/react` 18 with React 19). Align them and delete duplicates:

```bash
npm ls @types/react
npm install -D @types/react@^19 @types/react-dom@^19
```

## Debugging tip

Hover the call in your editor or temporarily assign each argument to a variable with the expected type — the error then moves to the exact argument at fault, which is easier to read than the overload list.
