---
error: "ReferenceError: process is not defined"
error_full: |
  Uncaught ReferenceError: process is not defined
      at index.js:3:15
cat: javascript
description: "Browser code referenced the Node.js global `process` (usually `process.env.SOMETHING`). Webpack 4 and Create React App used to polyfill or replace it; Vite, webpack 5 and plain browsers do not."
tldr: "In Vite use `import.meta.env.VITE_MY_VAR` (variables must start with `VITE_`) instead of `process.env.MY_VAR`. In webpack 5 replace values at build time with `new webpack.DefinePlugin({ 'process.env.API_URL': JSON.stringify(process.env.API_URL) })`. For a dependency that needs `process`, add `ProvidePlugin({ process: 'process/browser' })`."
keywords: uncaught referenceerror process is not defined vite process.env import.meta.env webpack 5 polyfill defineplugin provideplugin process/browser react browser env variables
related: [js-referenceerror-is-not-defined, js-require-is-not-defined, js-referenceerror-window-is-not-defined]
---
## What it means

`process` is a Node.js global. Browsers don't have it. When you write `process.env.API_URL` in frontend code, a bundler must replace that expression with a literal string at build time; if it doesn't, the browser evaluates `process` and throws.

- Create React App and webpack 4 did this automatically (and polyfilled `process`).
- **Vite** exposes env vars on `import.meta.env` instead.
- **webpack 5** removed automatic Node polyfills.

## Fix 1: Vite - use `import.meta.env`

```bash
# .env
VITE_API_URL=https://api.example.com
```

```js
const apiUrl = import.meta.env.VITE_API_URL;
```

Only variables prefixed with `VITE_` are exposed to client code (others stay private). Built-ins: `import.meta.env.MODE`, `import.meta.env.DEV`, `import.meta.env.PROD`. Restart the dev server after editing `.env`.

When migrating a large CRA codebase, you can map the old names in `vite.config.js`:

```js
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  return {
    define: {
      'process.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL),
    },
  };
});
```

Avoid `define: { 'process.env': process.env }`: it inlines every variable from your machine, including secrets, into the bundle.

## Fix 2: webpack 5 - DefinePlugin

```js
// webpack.config.js
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    }),
  ],
};
```

`DefinePlugin` does text replacement, so the value must be `JSON.stringify`-ed.

## Fix 3: a dependency uses `process` (e.g. `process.nextTick`, `process.browser`)

Install the browser shim and inject it:

```bash
npm install process
```

```js
new webpack.ProvidePlugin({ process: 'process/browser' })
```

In Vite, prefer a browser build of the library; otherwise `vite-plugin-node-polyfills` can provide `process`, `Buffer` and friends.

## Fix 4: Next.js

Next.js does inline `process.env.X` in client code, but only for variables prefixed with `NEXT_PUBLIC_`, and only when written literally. Dynamic access like `process.env[name]` or destructuring `const { API } = process.env` is not replaced and fails in the browser. Write `process.env.NEXT_PUBLIC_API_URL` directly.

## Fix 5: plain `<script>` without a bundler

There's no build step to replace anything. Put config in a global or a fetched JSON file:

```html
<script>window.APP_CONFIG = { apiUrl: "https://api.example.com" };</script>
```

## Related

If the error is about `require` or `module` instead, see [require is not defined](/javascript/js-require-is-not-defined/); for `window` on the server, see [window is not defined](/javascript/js-referenceerror-window-is-not-defined/).
