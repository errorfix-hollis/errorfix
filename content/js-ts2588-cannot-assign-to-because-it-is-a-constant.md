---
error: "TS2588: Cannot assign to 'x' because it is a constant."
error_full: |
  src/index.ts:4:1 - error TS2588: Cannot assign to 'count' because it is a constant.

  4 count = count + 1;
    ~~~~~
cat: javascript
description: "You reassigned a variable declared with `const`. TypeScript reports it at compile time; at runtime the same code throws `TypeError: Assignment to constant variable`."
tldr: "Declare the variable with `let` instead of `const` if it really needs a new value (`let count = 0;`). For loop variables use `let` (`for (let i = 0; ...)`). If you only change properties or array elements, keep `const` — `obj.x = 1` and `arr.push(1)` are allowed. Imports are read-only bindings and can't be reassigned (TS2632)."
keywords: ts2588 cannot assign to because it is a constant typescript const let reassign loop variable import read-only binding assignment to constant variable
related: [js-typeerror-assignment-to-constant-variable, js-ts2322-type-is-not-assignable-to-type, js-ts2304-cannot-find-name]
---
## What it means

`const` creates a binding that can't be reassigned. TypeScript catches the reassignment at compile time:

```ts
const count = 0;
count = count + 1;   // TS2588
count++;             // TS2588
count += 1;          // TS2588
```

In plain JavaScript the same code compiles but throws `TypeError: Assignment to constant variable.` when it runs.

## Fix 1: use let for values that change

```ts
let count = 0;
count = count + 1;
```

Only switch the one variable that's reassigned. Keeping `const` everywhere else is good practice (ESLint's `prefer-const` enforces it).

## Fix 2: loop counters

A classic `for` loop increments the counter, so it needs `let`:

```ts
for (const i = 0; i < 10; i++) {}   // TS2588 on i++
for (let i = 0; i < 10; i++) {}     // OK
```

`for...of` and `for...in` *can* use `const`, because each iteration gets a fresh binding:

```ts
for (const item of items) { console.log(item); }  // OK
```

But you can't reassign `item` inside that loop body.

## Fix 3: mutate instead of reassign

`const` prevents reassignment, not mutation. If you meant to change the contents, do that:

```ts
const user = { name: "Ann" };
user.name = "Bob";        // OK
user = { name: "Bob" };   // TS2588

const list: number[] = [];
list.push(1);             // OK
list = [...list, 1];      // TS2588
```

If you want the contents to be immutable too, use `as const` or `Readonly<T>`; that produces different errors (TS2540) when you try to change a property.

## Fix 4: reassigning an import

Imported bindings are read-only, even if exported with `let`:

```ts
import { config } from "./config";
config = loadConfig();   // TS2632: Cannot assign to 'config' because it is an import.
```

Export a setter function from the module, or export an object and change its properties:

```ts
// config.ts
export const config = { apiUrl: "" };
// elsewhere
config.apiUrl = "https://api.example.com";
```

## Fix 5: reassigning in a callback or state update

In React, state values are `const` from `useState`. Don't reassign them; call the setter:

```tsx
const [count, setCount] = useState(0);
count = count + 1;          // TS2588
setCount(c => c + 1);       // correct
```

## Fix 6: destructured constants

Destructuring with `const` makes every name constant:

```ts
const { page, size } = params;
page = 1;   // TS2588

let { page, size } = params;   // if you need to change them
```

Or destructure into a new variable: `const firstPage = page ?? 1;`.
