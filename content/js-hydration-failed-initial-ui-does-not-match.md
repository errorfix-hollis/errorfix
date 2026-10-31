---
error: "Hydration failed because the initial UI does not match what was rendered on the server"
error_full: |
  Error: Hydration failed because the initial UI does not match what was rendered on the server.
  Error: Text content does not match server-rendered HTML.
  Error: Hydration failed because the server rendered HTML didn't match the client.
cat: javascript
description: In Next.js (or any React SSR), the HTML React renders in the browser on first load differs from the HTML the server sent. Caused by browser-only values (window, Date, Math.random, localStorage) used during render, or invalid HTML nesting.
tldr: "Make the first client render identical to the server render: move browser-only values into `useEffect` (render a placeholder first), fix invalid nesting like `<div>` inside `<p>`, load client-only components with `dynamic(() => import(...), { ssr: false })`, and use `suppressHydrationWarning` only for unavoidable differences like timestamps."
keywords: nextjs react hydration failed initial ui does not match server rendered html text content does not match ssr useeffect window localstorage div inside p suppresshydrationwarning
related: [js-objects-are-not-valid-as-a-react-child, js-referenceerror-is-not-defined, js-too-many-re-renders]
---
## What it means

With server-side rendering, the server sends HTML, then React "hydrates" it in the browser: it renders the same components again and attaches to the existing DOM. React expects both renders to produce exactly the same markup. If they differ, it throws this error (React 18) or logs a diff (React 19), and re-renders the tree on the client.

## Cause 1: browser-only values during render

Anything that is different on the server and in the browser:

```jsx
// Wrong: server has no window; time and random differ between renders
<p>{typeof window !== 'undefined' ? 'client' : 'server'}</p>
<p>{new Date().toLocaleTimeString()}</p>
<p>{localStorage.getItem('name')}</p>
```

Render the same thing on both sides first, then update in an effect (effects don't run on the server):

```jsx
const [name, setName] = useState(null);
useEffect(() => { setName(localStorage.getItem('name')); }, []);
return <p>{name ?? 'Guest'}</p>;
```

A reusable pattern:

```jsx
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
```

## Cause 2: invalid HTML nesting

The browser's HTML parser "repairs" invalid markup from the server, so the DOM no longer matches what React expects. Common ones:

- `<div>` (or another `<p>`) inside `<p>`
- `<a>` inside `<a>`
- `<tr>` directly in `<table>` without `<tbody>`
- block elements inside `<button>` in some cases

```jsx
// Wrong
<p><div>Price</div></p>
// Right
<div><div>Price</div></div>
```

Watch for components like MUI `<Typography>` that render `<p>` by default; pass `component="div"`.

## Cause 3: a component that only works in the browser

Charts, maps, editors and anything touching `window` at import time. In Next.js load them without SSR:

```jsx
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('../components/Map'), { ssr: false });
```

In the App Router, `ssr: false` must be used inside a Client Component (`'use client'`).

## Cause 4: dates and locales

Server and browser can run in different time zones and locales, so `toLocaleString()` produces different text. Format with an explicit zone (`timeZone: 'UTC'`), format on the client after mount, or for a single element:

```jsx
<time suppressHydrationWarning>{new Date().toLocaleString()}</time>
```

`suppressHydrationWarning` only works one level deep and only for text/attributes; don't use it to hide real bugs.

## Cause 5: browser extensions

Extensions (Grammarly, password managers, translators, dark-mode tools) inject attributes into `<html>` or `<body>` before React hydrates. If the error mentions attributes you never wrote, test in an incognito window. For `<html>`/`<body>` attributes, adding `suppressHydrationWarning` to those tags in the root layout is the accepted workaround.

## Finding the mismatch

Run in development mode: React 19 / Next.js 15 print a diff showing the server vs client value. In older versions, check the "Text content did not match. Server: ... Client: ..." warning that precedes the error.
