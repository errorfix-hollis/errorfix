---
error: "Invalid hook call. Hooks can only be called inside of the body of a function component."
error_full: |
  Error: Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
  1. You might have mismatching versions of React and the renderer (such as React DOM)
  2. You might be breaking the Rules of Hooks
  3. You might have more than one copy of React in the same app
  See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.
cat: javascript
description: "A React hook (useState, useEffect, useContext, ...) ran outside a function component's render, or the app has two copies of React. The message lists the three possible reasons."
tldr: "Only call hooks at the top level of a function component or custom hook, never in regular functions, class components, callbacks, loops or conditions. Then check for duplicate React: `npm ls react` should show one version. In linked/monorepo packages make react a peerDependency and alias it to one copy."
keywords: react invalid hook call hooks can only be called inside of the body of a function component rules of hooks more than one copy of react npm ls react npm link peerDependencies useState class component
related: [js-too-many-re-renders, js-react-hook-useeffect-has-a-missing-dependency, js-objects-are-not-valid-as-a-react-child]
---
## What it means

React keeps track of hooks through the component that is currently rendering. If a hook is called when no component is rendering, or React's internal dispatcher comes from a different copy of React than the one rendering, you get this error. The message itself lists the three reasons; work through them in this order.

## Cause 1: hook called outside a component (Rules of Hooks)

Hooks must be called at the top level of a **function component** or a **custom hook** (a function whose name starts with `use`).

```jsx
// Wrong: called in a normal function
function getUser() {
  const [user] = useState(null);      // invalid hook call
}

// Wrong: inside an event handler
<button onClick={() => { const nav = useNavigate(); nav("/"); }} />

// Right: call at top level, use the result later
function Header() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/")}>Home</button>;
}
```

Also wrong: hooks inside class components, `useMemo`/`useEffect` callbacks, `.map()` callbacks, conditions and loops.

## Cause 2: calling a component as a function outside rendering

```jsx
// Wrong: Modal uses hooks, but here it is called from an event handler
onClick={() => showDialog(Modal({ title: "Hi" }))}

// Right: render it as an element
{open && <Modal title="Hi" />}
```

Calling a component function from an event handler, a router loader, `setTimeout`, or a non-React library callback runs its hooks while no component is rendering. Even inside render, prefer `<Profile />` over `{Profile()}`: the direct call attaches Profile's hooks to the parent and breaks as soon as it is called conditionally.

## Cause 3: more than one copy of React

Very common with `npm link`, monorepos, and component libraries that bundle React. Check:

```bash
npm ls react
npm ls react-dom
```

You want exactly one `react` (and every `react-dom` must match its version). Quick runtime check: in your app add `window.React1 = require('react')`, in the library `window.React2 = require('react')`, and compare `window.React1 === window.React2` in the console.

Fixes:

- In a library, list React as a **peer dependency**, not a dependency:

```json
{
  "peerDependencies": { "react": "^18 || ^19", "react-dom": "^18 || ^19" },
  "devDependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" }
}
```

- Mark React as external in the library's bundler (Rollup/Vite `external: ["react", "react-dom", "react/jsx-runtime"]`).
- With `npm link`, point the library at the app's copy: `npm link ../my-app/node_modules/react` from the library folder.
- Force one version with aliases. Vite: `resolve: { dedupe: ["react", "react-dom"] }`. Webpack:

```js
resolve: {
  alias: { react: path.resolve("./node_modules/react") }
}
```

- npm `overrides` / Yarn `resolutions` / pnpm `overrides` to pin one version across the workspace, then reinstall.

## Cause 4: mismatched React and React DOM versions

`react@19` with `react-dom@18` (or the reverse) breaks hooks. Upgrade both together:

```bash
npm install react@latest react-dom@latest
```

Same for React Native (`react` must match what your `react-native` version expects) and test renderers (`react-test-renderer` must match `react`).

## Cause 5: hooks in server-only code (Next.js)

In the App Router, files are Server Components by default and can't use `useState`/`useEffect`. Add `"use client"` at the top of the file that uses them. Hooks also can't be used in `getServerSideProps`, route handlers or middleware.

## Catch it early

Install `eslint-plugin-react-hooks` and enable `react-hooks/rules-of-hooks` (included in the recommended config). It flags hooks in conditions, loops, and non-hook functions at lint time.
