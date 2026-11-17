---
error: "SyntaxError: Identifier has already been declared"
error_full: |
  Uncaught SyntaxError: Identifier 'count' has already been declared
cat: javascript
description: "A `let`, `const` or `class` name was declared twice in the same scope, or a script that declares top-level `let`/`const` was loaded twice. Unlike `var`, these cannot be redeclared."
tldr: "Rename or remove the second declaration, or turn it into an assignment (`count = 5` instead of `let count = 5`). In the browser console or when a script is included twice, wrap code in a block or module, or reload the page."
keywords: javascript syntaxerror identifier has already been declared let const redeclare duplicate variable console script loaded twice
related: [js-referenceerror-is-not-defined, js-typeerror-assignment-to-constant-variable, js-referenceerror-cannot-access-before-initialization]
---
## What it means

`let`, `const`, `class` (and function parameters with `let`) create bindings that may exist only once per scope. Declaring the same name again in the *same* scope is a `SyntaxError`, so the whole script fails to run - not just the line in question.

```js
let count = 0;
let count = 1;   // SyntaxError: Identifier 'count' has already been declared
```

`var` allows redeclaration, which is why older code never hit this.

## Cause 1: declaring instead of reassigning

```js
let total = 0;
// ... later in the same scope
let total = 10;   // SyntaxError
```

## Fix 1: assign, don't redeclare

```js
let total = 0;
total = 10;
```

If you need a separate value, give it a different name, or put it in its own block `{ ... }` where shadowing is allowed.

## Cause 2: a parameter redeclared in the function body

```js
function greet(name) {
  let name = name.trim();   // SyntaxError
}
```

## Fix 2: reassign the parameter or use a new name

```js
function greet(name) {
  const cleanName = name.trim();
}
```

## Cause 3: the same script is loaded twice

Classic (non-module) scripts share one global scope. If `app.js` declares `const API = ...` at the top level and the page includes it twice, or two different scripts both declare `const config`, the second one throws.

```html
<script src="app.js"></script>
<script src="app.js"></script>  <!-- duplicate -->
```

## Fix 3: load once, or use modules

- Remove the duplicate `<script>` tag (check templates, layouts and tag managers).
- Use `<script type="module">`: each module has its own scope, so top-level names don't collide.
- Or wrap the file in an IIFE: `(() => { ... })();`

## Cause 4: browser DevTools console

Each line you paste into the console runs in the same global scope. Running `let x = 1` twice gives this error. Chrome allows re-declaring `let`/`const` in the console since v80, but other consoles and REPLs may not. Reload the page, or use a block:

```js
{ let x = 1; console.log(x); }
```

## Cause 5: import name collides with a local declaration

```js
import { useState } from "react";
const useState = () => {};   // SyntaxError: Identifier 'useState' has already been declared
```

Rename one of them, or alias the import: `import { useState as reactUseState } from "react";`.

## Cause 6: switch cases share one scope

```js
switch (type) {
  case "a":
    const msg = "A";
    break;
  case "b":
    const msg = "B";   // SyntaxError
    break;
}
```

Wrap each case body in braces:

```js
case "a": {
  const msg = "A";
  break;
}
```

ESLint rules `no-redeclare` and `no-case-declarations` catch most of these before you run the code.
