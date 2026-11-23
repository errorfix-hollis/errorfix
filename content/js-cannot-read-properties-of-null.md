---
error: "TypeError: Cannot read properties of null (reading '...')"
error_full: |
  Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
  TypeError: Cannot read properties of null (reading 'value')
  TypeError: Cannot read properties of null (reading 'useState')
cat: javascript
description: "You accessed a property on a value that is `null`. In browser code this is almost always `document.getElementById()` or `querySelector()` returning null because the element doesn't exist (yet)."
tldr: "Make sure the element exists before your script runs: put the `<script>` at the end of `<body>`, add `defer`, or wrap code in `DOMContentLoaded`. Check the selector/ID spelling, and guard with `el?.addEventListener(...)` or `if (el) {...}`. For `(reading 'useState')`, you have duplicate React copies — run `npm ls react`."
keywords: cannot read properties of null reading addEventListener value innerHTML style classList getElementById returns null querySelector null script defer DOMContentLoaded useState null react
related: [js-cannot-read-properties-of-undefined, js-cannot-set-properties-of-null, js-invalid-hook-call]
---
## What it means

JavaScript tried to read `something.prop` but `something` was `null`. The name in parentheses is the property it tried to read, not the variable that was null. So `(reading 'addEventListener')` means the thing you called `.addEventListener` on is null.

DOM lookups are the usual source: `getElementById`, `querySelector` and `closest` return `null` (not `undefined`) when nothing matches. `localStorage.getItem()` and `String.prototype.match()` also return `null`.

## Cause 1: the script runs before the element exists

```html
<head>
  <script src="app.js"></script>   <!-- runs before <body> is parsed -->
</head>
<body>
  <button id="save">Save</button>
</body>
```

`document.getElementById('save')` is null at that point. Fix with any one of:

```html
<script src="app.js" defer></script>
```

```js
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('save').addEventListener('click', save);
});
```

Or move the `<script>` tag to just before `</body>`. Module scripts (`type="module"`) are deferred automatically.

## Cause 2: wrong ID or selector

```js
document.getElementById('#save');     // wrong: no '#' with getElementById
document.querySelector('save');       // wrong: looks for a <save> tag
document.querySelector('#save');      // right
document.querySelector('.btn-save');  // class selector
```

IDs are case-sensitive. Log it to check: `console.log(document.querySelector('#save'))`.

## Cause 3: the element is only on some pages or rendered later

A shared script that runs on every page will fail on pages without that element. Guard it:

```js
const form = document.querySelector('#signup');
if (form) {
  form.addEventListener('submit', onSubmit);
}
// or
form?.addEventListener('submit', onSubmit);
```

For content inserted later (fetched HTML, a framework render), attach the listener after insertion, or use event delegation:

```js
document.addEventListener('click', (e) => {
  if (e.target.closest('#save')) save();
});
```

## Cause 4: a React ref or state that starts as null

```jsx
const inputRef = useRef(null);
console.log(inputRef.current.value); // null during the first render
```

Read refs in `useEffect` or event handlers, after mount. For state initialised with `useState(null)` and filled by a fetch, render conditionally:

```jsx
if (!user) return <p>Loading...</p>;
return <h1>{user.name}</h1>;
```

## Cause 5: `(reading 'useState')` or `(reading 'useContext')`

Here `React` itself resolved to null inside a hook dispatcher. This means two copies of React are loaded (e.g. a linked library with its own `react`), or a hook is called outside a component. Check with:

```bash
npm ls react
```

See [Invalid hook call](/javascript/js-invalid-hook-call/) for the full fix.

## Other null sources

```js
const data = JSON.parse(localStorage.getItem('settings')) ?? {};
const m = str.match(/(\d+)/);
const num = m ? m[1] : null;
```
