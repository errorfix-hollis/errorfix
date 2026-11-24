---
error: "ReferenceError: window is not defined"
error_full: |
  ReferenceError: window is not defined
      at Module.<anonymous> (/app/.next/server/pages/index.js:12:5)
  ReferenceError: document is not defined
  ReferenceError: localStorage is not defined
cat: javascript
description: "Code that uses browser globals (`window`, `document`, `localStorage`, `navigator`) ran in Node.js, which has none of them. Typical with server-side rendering in Next.js, Nuxt, SvelteKit, Remix, or when a browser-only library is imported on the server."
tldr: "Only touch browser globals after the component mounts (`useEffect`) or behind `typeof window !== 'undefined'`. In Next.js App Router add `'use client'` and still move window access into `useEffect`; load browser-only libraries with `dynamic(() => import('...'), { ssr: false })` from a client component."
keywords: referenceerror window is not defined document is not defined localstorage is not defined next.js ssr server side rendering nuxt node typeof window useeffect dynamic import ssr false
related: [js-hydration-failed-initial-ui-does-not-match, js-referenceerror-is-not-defined, js-require-is-not-defined]
---
## What it means

`window` exists only in browsers. In Node.js (and on the server side of any SSR framework) the global object is `globalThis`/`global`, and `window`, `document`, `localStorage`, `sessionStorage` and `navigator` (older Node) are undefined. Accessing an undeclared global throws `ReferenceError`.

The stack trace tells you where: paths like `.next/server/...`, `.nuxt/`, `.svelte-kit/output/server` mean the code ran during server rendering or the build.

## Cause 1: browser API used during render (Next.js, React SSR)

The component body runs on the server for the first render, even with `'use client'`; that directive only means the component *also* runs in the browser.

```jsx
// Breaks on the server
const width = window.innerWidth;
```

Move it into `useEffect`, which runs only in the browser:

```jsx
'use client';
import { useEffect, useState } from 'react';

export default function Size() {
  const [width, setWidth] = useState(null);
  useEffect(() => {
    setWidth(window.innerWidth);
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return <p>{width ?? '...'}</p>;
}
```

Don't fix it with `typeof window !== 'undefined' ? A : B` inside the JSX: the server and client render different HTML and you get a [hydration mismatch](/javascript/js-hydration-failed-initial-ui-does-not-match/). Render a neutral value first and update in `useEffect`.

## Cause 2: a browser-only library imported at the top level

Libraries like Leaflet, Chart.js plugins, some editors and analytics SDKs touch `window` as soon as they are imported. Load them only on the client:

```jsx
'use client';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('../components/Map'), { ssr: false });
```

In the App Router, `ssr: false` is only allowed inside a client component. Alternatively import inside an effect: `useEffect(() => { import('leaflet').then(L => ...) }, [])`.

Nuxt: wrap with `<ClientOnly>` or name the plugin `*.client.js`. SvelteKit: use `onMount` or check `browser` from `$app/environment`. Gatsby: guard in `useEffect` or use `loaders.null()` for the module in `gatsby-node.js`.

## Cause 3: utility code shared with the server

For helpers that may run in both places, guard with `typeof` (which never throws for undeclared names):

```js
export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}
```

Use `globalThis` when you just need the global object in any environment.

## Cause 4: tests running in Node

Jest 27+ and Vitest default to the `node` environment. For DOM tests set a browser-like environment:

```js
// jest.config.js
module.exports = { testEnvironment: 'jsdom' };  // npm i -D jest-environment-jsdom
```

```js
// vitest.config.js
export default { test: { environment: 'jsdom' } };   // npm i -D jsdom
```

Or per file: `/** @jest-environment jsdom */` at the top.

## Cause 5: a plain Node script

If you're running a browser script with `node script.js`, it simply won't work there. Run it in the browser, or for scraping/DOM parsing in Node use `jsdom` or a headless browser (Playwright, Puppeteer).
