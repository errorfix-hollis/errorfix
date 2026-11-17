---
error: "ReferenceError: Cannot access 'x' before initialization"
error_full: |
  Uncaught ReferenceError: Cannot access 'user' before initialization
      at main (app.js:3:15)
cat: javascript
description: "A `let`, `const` or `class` was used before the line that declares it ran (the temporal dead zone). Often caused by ordering of code, or by circular imports between ES modules."
tldr: "Move the declaration above its first use, or move the use into a function that runs later. If it happens at import time, look for a circular import (A imports B, B imports A) and break it by moving the shared code into a third module or deferring access to inside a function."
keywords: javascript referenceerror cannot access before initialization temporal dead zone tdz let const class circular import dependency webpack vite
related: [js-referenceerror-is-not-defined, js-syntaxerror-identifier-has-already-been-declared, js-requested-module-does-not-provide-an-export-named]
---
## What it means

`let`, `const` and `class` declarations are hoisted to the top of their scope, but stay *uninitialized* until the declaration line executes. Touching them before that point - the "temporal dead zone" (TDZ) - throws this error. With `var` you would silently get `undefined` instead.

```js
console.log(user);        // ReferenceError: Cannot access 'user' before initialization
const user = "alice";
```

Note the difference from `x is not defined`: here the name exists in the scope, it just hasn't been initialized yet.

## Cause 1: using a variable above its declaration

```js
function main() {
  greet(name);
  const name = "Bob";
}
```

## Fix 1: reorder

```js
function main() {
  const name = "Bob";
  greet(name);
}
```

## Cause 2: a variable referenced in its own initializer

```js
const config = { ...config, debug: true };   // ReferenceError
```

The inner `config` refers to the one being declared (shadowing an outer one). Use a different name:

```js
const finalConfig = { ...baseConfig, debug: true };
```

## Cause 3: classes used before declaration

Function declarations are fully hoisted; classes are not:

```js
const a = new Animal();   // ReferenceError
class Animal {}
```

Declare the class first, or put the instantiation in a function that is called after the module has loaded.

## Cause 4: circular imports (the most confusing one)

```js
// a.js
import { b } from "./b.js";
export const a = "A";

// b.js
import { a } from "./a.js";
export const b = a + "B";   // ReferenceError: Cannot access 'a' before initialization
```

When `a.js` loads, it first evaluates `b.js`, which reads `a` before `a.js` has run its own `export const a`. Bundlers (webpack, Vite, Rollup) produce the same error, often with mangled names like `Cannot access 'ot' before initialization`.

## Fix 4: break the cycle

- Move the shared value into a third module that both import.
- Defer access into a function that runs later, not at module top level:

```js
// b.js
import { a } from "./a.js";
export const getB = () => a + "B";
```

- In React/Redux apps, a common cycle is `store.js` -> `slice.js` -> `store.js`. Import types only (`import type`) or pass the store in instead of importing it.

To find cycles automatically:

```bash
npx madge --circular src/
```

For webpack there is also `circular-dependency-plugin`.

## Cause 5: `switch` or block scope surprises

```js
let x = 1;
{
  console.log(x);   // ReferenceError: the inner x shadows the outer one
  let x = 2;
}
```

The inner `let x` makes the whole block's `x` the uninitialized one. Rename the inner variable.

ESLint's `no-use-before-define` rule flags causes 1-3 at edit time.
