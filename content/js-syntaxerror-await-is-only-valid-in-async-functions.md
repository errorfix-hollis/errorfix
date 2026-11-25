---
error: "SyntaxError: await is only valid in async functions and the top level bodies of modules"
error_full: |
  const data = await fetchData();
               ^^^^^
  SyntaxError: await is only valid in async functions and the top level bodies of modules
cat: javascript
description: "You used await inside a function that isn't marked async, or at the top level of a CommonJS script / classic browser script. Top-level await only works in ES modules."
tldr: "Mark the enclosing function `async` (`async function load() { await ... }`, `async () => {...}`). Inside callbacks like `forEach` or `.map`, the callback itself must be async; use `for...of` or `await Promise.all(arr.map(async x => ...))`. For top-level await use an ES module (`\"type\": \"module\"` in package.json, `.mjs`, or `<script type=\"module\">`) or wrap in `(async () => { ... })();`."
keywords: javascript syntaxerror await is only valid in async functions and the top level bodies of modules async function top-level await commonjs node mjs type module foreach callback typescript TS1308 unexpected reserved word
related: [node-cannot-use-import-statement-outside-a-module, js-syntaxerror-unexpected-token-export, js-require-is-not-defined]
---
## What it means

`await` is only a keyword in two places: inside an `async` function, and at the top level of an **ES module**. Anywhere else the parser rejects it before running any code.

Other wordings of the same error:

- Chrome/Node: `await is only valid in async functions and the top level bodies of modules`
- Firefox: `await is only valid in async functions, async generators and modules`
- Babel / older tools: `Unexpected reserved word 'await'`
- TypeScript: `TS1308: 'await' expressions are only allowed within async functions and at the top levels of modules.`

## Cause 1: the function isn't async

```js
function loadUser(id) {
  const res = await fetch(`/api/users/${id}`);  // SyntaxError
  return res.json();
}
```

Fix:

```js
async function loadUser(id) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

const loadUser2 = async (id) => { /* ... */ };
class Api { async load() { /* ... */ } }
```

Callers now get a Promise and must `await` it too (or use `.then()`).

## Cause 2: await inside a callback

Even inside an async function, a nested callback is its own function:

```js
async function saveAll(items) {
  items.forEach(item => {
    await save(item);          // SyntaxError: callback isn't async
  });
}
```

Making the callback `async` compiles, but `forEach` won't wait for it. Use one of:

```js
// one after another
for (const item of items) {
  await save(item);
}

// in parallel
await Promise.all(items.map(item => save(item)));
```

Same for `setTimeout`, event listeners, `new Promise(resolve => ...)` executors and React `useEffect`: mark the callback async, or (for `useEffect`, which must not return a Promise) define an async function inside and call it:

```js
useEffect(() => {
  async function load() { setData(await fetchData()); }
  load();
}, []);
```

## Cause 3: top-level await in CommonJS (Node.js)

Node treats `.js` files as CommonJS unless told otherwise, and CommonJS has no top-level await.

Option A: make it an ES module: add `"type": "module"` to `package.json`, or rename the file to `.mjs`. (Then use `import` instead of `require`.)

Option B: wrap the code:

```js
(async () => {
  const data = await fetchData();
  console.log(data);
})().catch(err => { console.error(err); process.exit(1); });
```

## Cause 4: top-level await in a browser script

Classic `<script>` tags aren't modules. Use:

```html
<script type="module" src="app.js"></script>
```

or wrap in an async IIFE as above.

## Cause 5: TypeScript / bundler target

TypeScript allows top-level await only with `"module"` set to `es2022`, `esnext`, `node16`/`nodenext` or `preserve`, and `"target"` `es2017` or higher. Otherwise you get TS1378. Update `tsconfig.json`:

```json
{ "compilerOptions": { "target": "es2022", "module": "es2022" } }
```

Bundlers (Vite, webpack 5) support top-level await in ESM output; webpack 4 needs `experiments.topLevelAwait`.
