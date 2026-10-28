---
error: "ReferenceError: x is not defined"
error_full: |
  Uncaught ReferenceError: $ is not defined
      at main.js:1:1
cat: javascript
description: You used a variable or function name that doesn't exist in the current scope. Typo, missing import, script loaded in the wrong order, browser-only global used in Node (or vice versa), or a variable defined inside another block.
tldr: "Check spelling and scope, import the name (`import x from ...`), and make sure library scripts load before your code. `window`/`document` don't exist in Node; `process`/`__dirname` don't exist in browsers or ES modules."
keywords: javascript referenceerror is not defined $ jquery window document process __dirname es module scope node browser
related: [js-require-is-not-defined, js-is-not-a-function]
---
## What it means

JavaScript looked up a name through every enclosing scope up to the global one and didn't find it. (If the name exists but its value is `undefined`, you'd get `Cannot read properties of undefined` instead.)

## Cause 1: typo or wrong case

`useState` vs `usestate`, `myVar` vs `myvar`. JavaScript names are case-sensitive.

## Cause 2: missing import

```js
const [count, setCount] = useState(0);   // ReferenceError: useState is not defined
```

```js
import { useState } from "react";
```

## Cause 3: script order (`$ is not defined`, `jQuery is not defined`)

Your script runs before the library has loaded:

```html
<script src="main.js"></script>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
```

Load the library first. With `defer`/`async` on one but not the other, order can also break; use `defer` on both (deferred scripts run in order).

## Cause 4: browser vs Node globals

- `window`, `document`, `localStorage`, `navigator` exist only in the browser. In Next.js/Nuxt server rendering, access them inside `useEffect` or behind `typeof window !== "undefined"`.
- `process`, `require`, `module`, `__dirname` exist in CommonJS Node, not in the browser. In bundlers use `import.meta.env` (Vite) for env vars.
- In Node ES modules, `__dirname` is not defined:

```js
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
```

## Cause 5: block scope

```js
if (ok) {
  const message = "hi";
}
console.log(message);   // ReferenceError
```

Declare the variable in the outer scope. `let` and `const` are block-scoped; also, using them before their declaration line throws `Cannot access 'x' before initialization`.

## Cause 6: inline event handlers with modules

Functions in `<script type="module">` aren't global, so `onclick="doThing()"` can't see them. Attach handlers with `addEventListener`, or assign `window.doThing = doThing`.
