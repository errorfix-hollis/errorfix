---
error: "TypeError: Assignment to constant variable."
error_full: |
  Uncaught TypeError: Assignment to constant variable.
      at counter (app.js:4:9)
      at app.js:8:1
cat: javascript
description: "You reassigned a variable declared with const. const forbids rebinding the name (x = ..., x++, x += ...), though it still lets you mutate the object or array it points to."
tldr: "Declare variables you need to reassign with `let` instead of `const`: `let total = 0; total += 5;`. In loops use `for (let i = 0; ...)`, not `const i`. To change objects/arrays declared with const, mutate them (`arr.push(x)`, `obj.key = v`) rather than reassigning. Imported bindings are read-only — export a setter function instead."
keywords: typeerror assignment to constant variable javascript const let reassign for loop const i++ node react typeerror invalid assignment to const firefox
related: [js-referenceerror-is-not-defined, js-is-not-a-function, js-cannot-read-properties-of-undefined]
---
## What it means

`const` creates a binding that can't be pointed at a different value after initialisation. Any of these on a `const` throws at runtime:

```js
const count = 0;
count = 1;        // TypeError: Assignment to constant variable.
count++;          // same
count += 1;       // same
```

Browsers word it differently: Firefox says `TypeError: invalid assignment to const 'count'`, Safari says `TypeError: Attempted to assign to readonly property.` TypeScript catches it at compile time as `TS2588: Cannot assign to 'count' because it is a constant.`

## Fix 1: use `let` for values that change

```js
let count = 0;
count += 1;       // OK
```

Rule of thumb: start with `const`; switch to `let` only for variables you actually reassign (counters, accumulators, values set in `if`/`else` branches). Avoid `var` — it's function-scoped and hoisted.

## Fix 2: `const` in a classic for loop

```js
for (const i = 0; i < 10; i++) { }   // TypeError on i++

for (let i = 0; i < 10; i++) { }     // OK
```

`for...of` and `for...in` are fine with `const`, because each iteration creates a new binding:

```js
for (const item of items) { console.log(item); }
```

## Fix 3: mutate instead of reassign

`const` only freezes the *binding*, not the value. Arrays and objects can still change:

```js
const list = [];
list.push(1);          // OK
list = [...list, 2];   // TypeError

const user = { name: 'Ann' };
user.name = 'Bob';     // OK
user = { name: 'Bob' };// TypeError
```

Either mutate in place, or declare with `let` if you prefer the immutable "replace the whole value" style. (To make the object itself unchangeable, use `Object.freeze(obj)`.)

## Fix 4: React state

Reassigning state variables from `useState` throws, because they're `const` destructured:

```jsx
const [count, setCount] = useState(0);
count = count + 1;              // TypeError
setCount(c => c + 1);           // correct
```

Even if you used `let`, reassigning would not re-render — always use the setter.

## Fix 5: reassigning an import

ES module imports are live, read-only bindings:

```js
import { config } from './config.js';
config = loadConfig();        // TypeError: Assignment to constant variable.
config.debug = true;          // OK if config is an object (mutates the shared object)
```

To replace the value, export a function from the module that owns it:

```js
// config.js
export let config = {};
export function setConfig(c) { config = c; }

// app.js
import { config, setConfig } from './config.js';
setConfig(loadConfig());
```

## Fix 6: same name declared twice in different scopes

Sometimes you *meant* to assign to an outer `let`, but an inner `const` with the same name shadows it:

```js
let result;
if (ok) {
  const result = compute();   // new inner variable
  result = normalise(result); // TypeError: this is the inner const
}
```

Remove the inner `const` keyword (`result = compute();`) so the outer variable is assigned. Linters flag this: ESLint `no-const-assign` (in `eslint:recommended`) and `no-shadow`.
