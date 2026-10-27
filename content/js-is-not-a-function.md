---
error: "TypeError: x is not a function"
error_full: |
  Uncaught TypeError: data.map is not a function
      at App (App.js:12:18)
cat: javascript
description: You called something with () that isn't a function, e.g. .map on an object instead of an array, a misspelled method, a wrong import, or a variable that shadows the function.
tldr: "Log the value before calling it: `console.log(typeof x, x)`. For `.map is not a function`, the value isn't an array (often an object like `{data: [...]}` from an API). For imports, check default vs named export."
keywords: javascript typeerror is not a function map is not a function foreach react undefined default export named import jquery
related: [js-cannot-read-properties-of-undefined, js-unexpected-token-in-json]
---
## What it means

The thing before `(...)` exists, but it's not a function. Check what it really is:

```js
console.log(typeof data.map, data);
```

## Cause 1: `.map` / `.forEach` / `.filter` on a non-array

Very common with API responses:

```js
const res = await fetch("/api/users");
const data = await res.json();   // { users: [...], total: 10 }
data.map(...)                     // TypeError: data.map is not a function
```

Use the array inside: `data.users.map(...)`. If the value might be missing during loading (React), default it:

```js
const [users, setUsers] = useState([]);   // not useState({}) or useState()
(users ?? []).map(...)
```

`NodeList` from `querySelectorAll` has `forEach` but not `map`; convert first: `Array.from(nodes).map(...)`. Objects need `Object.entries(obj).map(...)`.

## Cause 2: default vs named import

```js
// utils.js
export function format() {}

// app.js
import format from "./utils.js";   // default import: undefined or the module
format();                           // TypeError: format is not a function
```

Match the export:

```js
import { format } from "./utils.js";
```

With CommonJS, `const format = require("./utils")` gives the whole `module.exports` object; use `const { format } = require("./utils")`.

## Cause 3: typo or wrong method name

`document.getElementByID` (should be `getElementById`), `arr.lenght()`, `str.contains()` (should be `includes`). Check MDN for the exact name.

## Cause 4: a variable shadows the function

```js
let name = "x";
function name() {}     // overwritten by the string
```

Or inside a component: `const [filter, setFilter] = useState("")` and later calling `items.filter(...)` is fine, but calling `filter(...)` is not.

## Cause 5: missing semicolon before `(`

```js
const a = b
(function () {})()     // parsed as b(function...)(...)
```

Add a semicolon at the end of the previous line.

## Cause 6: `this` lost in a callback

```js
button.addEventListener("click", this.handle);   // `this` inside handle is the button
```

Bind it or use an arrow function: `() => this.handle()`.
