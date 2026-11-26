---
error: "Uncaught (in promise) Error"
error_full: |
  Uncaught (in promise) Error: Request failed with status code 404
  Uncaught (in promise) TypeError: Failed to fetch
  Uncaught (in promise) undefined
  [UnhandledPromiseRejection: This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch().]
cat: javascript
description: "A Promise was rejected and nothing handled the rejection. The text after \"(in promise)\" is the real error; the prefix only tells you no .catch() or try/catch caught it."
tldr: "Read the error after `Uncaught (in promise)` and fix that. Then handle rejections: wrap `await` calls in `try { ... } catch (err) { ... }`, add `.catch(err => ...)` to promise chains, and return/await promises inside `useEffect` and event handlers."
keywords: javascript uncaught in promise error unhandled promise rejection async await try catch .catch axios fetch unhandledrejection node err_unhandled_rejection
related: [js-typeerror-failed-to-fetch, js-syntaxerror-await-is-only-valid-in-async-functions, js-cannot-read-properties-of-undefined]
---
## What it means

When a Promise rejects (an `async` function throws, `fetch` fails, axios gets a 4xx/5xx), the rejection travels up the chain until something handles it with `.catch()` or `try/catch` around an `await`. If nothing does, the browser logs `Uncaught (in promise)` followed by the rejection reason.

So this is two problems:

1. The actual error (e.g. `Request failed with status code 404`, `Failed to fetch`).
2. Missing error handling.

In Node.js 15+, an unhandled rejection crashes the process with `[UnhandledPromiseRejection: ...]` / `ERR_UNHANDLED_REJECTION`.

## Cause 1: await without try/catch

```js
async function loadUser() {
  const res = await axios.get('/api/user');   // throws on 404
  setUser(res.data);
}
loadUser();
```

## Fix 1: catch it where you can do something useful

```js
async function loadUser() {
  try {
    const res = await axios.get('/api/user');
    setUser(res.data);
  } catch (err) {
    console.error('Loading user failed:', err);
    setError(err.message);
  }
}
```

Note that `fetch` does **not** reject on 404/500, only on network/CORS failures. Check `res.ok` yourself:

```js
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
```

## Cause 2: promise chain without .catch()

```js
fetch(url).then(r => r.json()).then(render);
```

## Fix 2: end every chain with .catch()

```js
fetch(url)
  .then(r => r.json())
  .then(render)
  .catch(err => showError(err));
```

## Cause 3: fire-and-forget calls in React

```jsx
useEffect(() => {
  loadData();   // returned promise is ignored
}, []);
```

## Fix 3: handle inside the effect

```jsx
useEffect(() => {
  let ignore = false;
  (async () => {
    try {
      const data = await loadData();
      if (!ignore) setData(data);
    } catch (err) {
      if (!ignore) setError(err);
    }
  })();
  return () => { ignore = true; };
}, []);
```

Same for `onClick={async () => ...}` handlers: put a `try/catch` inside.

## Cause 4: `Uncaught (in promise) undefined` or a plain object

Something called `reject()` with no argument, or threw a non-Error value. You get no stack trace. Always reject with an `Error`:

```js
return Promise.reject(new Error('Token expired'));
```

`Uncaught (in promise) DOMException: The play() request was interrupted` comes from `video.play()`, which returns a promise — add `.catch(() => {})` or handle autoplay being blocked.

## Cause 5: a forgotten await

```js
try {
  saveData();           // missing await: rejection escapes the try
} catch (e) { ... }
```

Use `await saveData();`. ESLint's `@typescript-eslint/no-floating-promises` rule catches these.

## Global safety net

Log anything you missed (don't use this as the main handling):

```js
// Browser
window.addEventListener('unhandledrejection', e => console.error(e.reason));
// Node.js
process.on('unhandledRejection', reason => { console.error(reason); process.exit(1); });
```
