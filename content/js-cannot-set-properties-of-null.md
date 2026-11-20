---
error: "Uncaught TypeError: Cannot set properties of null (setting 'innerHTML')"
error_full: |
  Uncaught TypeError: Cannot set properties of null (setting 'innerHTML')
  Uncaught TypeError: Cannot set properties of null (setting 'textContent')
  Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
cat: javascript
description: "`document.getElementById()` or `querySelector()` returned `null` because no matching element existed when the code ran: the script runs before the HTML is parsed, or the id/selector is wrong."
tldr: "Load the script after the DOM is ready: add `defer` to the tag (`<script src=\"app.js\" defer></script>`), move it before `</body>`, or wrap code in `document.addEventListener('DOMContentLoaded', ...)`. Then check the id/selector matches exactly (case-sensitive, no `#` in `getElementById`)."
keywords: javascript cannot set properties of null setting innerhtml textcontent value style onclick getelementbyid queryselector returns null defer domcontentloaded addeventlistener
related: [js-cannot-read-properties-of-undefined, js-referenceerror-is-not-defined, js-is-not-a-function]
---
## What it means

Something like this evaluated to `null`:

```js
document.getElementById("output").innerHTML = "Hi";
// TypeError: Cannot set properties of null (setting 'innerHTML')
```

`getElementById`, `querySelector` and `closest` return `null` when nothing matches. Setting (or reading) any property on `null` throws. The property name in parentheses (`innerHTML`, `textContent`, `value`, `onclick`, `src`...) tells you which line it is.

## Cause 1: the script runs before the element exists

A `<script>` in `<head>` runs immediately, before the browser has parsed the `<body>`:

```html
<head>
  <script src="app.js"></script>   <!-- #output doesn't exist yet -->
</head>
<body>
  <div id="output"></div>
</body>
```

Fix with any of these:

```html
<script src="app.js" defer></script>     <!-- best: runs after parsing -->
<script type="module" src="app.js"></script>  <!-- modules are deferred by default -->
```

or put the script tag just before `</body>`, or wait for the DOM in code:

```js
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("output").textContent = "Hi";
});
```

## Cause 2: the id or selector doesn't match

```js
document.getElementById("#output");   // wrong: no # with getElementById
document.querySelector("output");     // wrong: that's a tag selector
document.querySelector("#output");    // right
document.getElementById("Output");    // ids are case-sensitive
```

Check in DevTools console: `document.querySelector("#output")`. If it prints `null`, the element isn't in the DOM with that id. Also watch for duplicated ids, typos, and `class` vs `id`.

## Cause 3: the element is created later

In React, Vue, or any code that renders HTML dynamically, the element appears after your script ran, or only under some condition. Don't query the DOM directly in these frameworks — use a ref:

```jsx
const ref = useRef(null);
useEffect(() => {
  ref.current.textContent = "Hi";   // runs after mount
}, []);
return <div ref={ref} />;
```

For content loaded via `fetch`, query the elements after inserting the HTML.

## Cause 4: the script is shared by several pages

A single `app.js` included on every page will fail on pages that don't have the element. Guard it:

```js
const el = document.getElementById("output");
if (el) {
  el.textContent = "Hi";
}
// or
document.querySelector("#btn")?.addEventListener("click", onClick);
```

Note optional chaining works for reading/calling (`?.`), but you can't assign through it (`el?.textContent = "x"` is a syntax error), so use an `if` for assignments.
