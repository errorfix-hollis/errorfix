---
error: "Module not found: Error: Can't resolve"
error_full: |
  Module not found: Error: Can't resolve './components/Header' in '/app/src'
  Module not found: Error: Can't resolve 'axios' in '/app/src'
  BREAKING CHANGE: webpack < 5 used to include polyfills for node.js core modules by default.
  Module not found: Error: Can't resolve 'crypto' in '/app/node_modules/some-lib'
cat: javascript
description: webpack (used by Create React App, Next.js, Angular, Storybook...) couldn't find a file or package you imported. The path or case is wrong, the package isn't installed, an alias isn't configured, or it's a Node core module that webpack 5 no longer polyfills.
tldr: "For packages: `npm install <name>`. For local files: check the relative path and exact letter case (Linux/CI are case-sensitive) and the file extension. For path aliases, configure `resolve.alias` in webpack or `paths` in tsconfig. For `crypto`/`stream`/`buffer` etc. in webpack 5: add `resolve.fallback` polyfills or set them to `false`."
keywords: webpack module not found error can't resolve react create-react-app nextjs import path case sensitive alias tsconfig paths resolve.fallback polyfill crypto stream buffer webpack 5
related: [node-cannot-find-module, js-ts2307-cannot-find-module-or-its-corresponding-type-declarations, npm-eresolve-unable-to-resolve-dependency-tree]
---
## What it means

webpack follows every `import`/`require` to build the bundle. "Can't resolve X in DIR" means that starting from `DIR`, it tried the path and `node_modules` lookup for `X` and found nothing. The two parts of the message tell you what to check: **what** was imported, and **from where**.

## Cause 1: the package isn't installed

`Can't resolve 'axios'` (no `./`) means a package:

```bash
npm ls axios           # is it there?
npm install axios
```

If it's in `package.json` but missing, reinstall: `rm -rf node_modules && npm install`. In monorepos make sure you install in the right workspace.

## Cause 2: wrong relative path

Paths are relative to the **importing file**, not the project root:

```js
// in src/pages/Home.jsx
import Header from './components/Header';   // looks in src/pages/components/
import Header from '../components/Header';  // looks in src/components/
```

## Cause 3: letter case

macOS and Windows filesystems are usually case-insensitive, Linux isn't. `import Header from './header'` works locally but fails in Docker/CI if the file is `Header.jsx`. Match the exact file name.

If you renamed only the case, Git may not have recorded it:

```bash
git mv src/components/header.jsx src/components/Header.jsx
```

## Cause 4: missing extension

webpack only tries the extensions in `resolve.extensions`. A custom config without `.ts`/`.tsx` can't find TypeScript files:

```js
// webpack.config.js
module.exports = {
  resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js'] },
};
```

ES module packages (`"type": "module"`) may require full paths with extensions: `import x from './util.js'`.

## Cause 5: path aliases not configured for webpack

`import Button from '@/components/Button'` needs an alias. TypeScript's `paths` in `tsconfig.json` only affects type checking; the bundler must know too:

```js
const path = require('path');
module.exports = {
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
};
```

Next.js and Vite read `tsconfig.json`/`jsconfig.json` `paths` (Vite needs `resolve.alias` or the `vite-tsconfig-paths` plugin). Restart the dev server after changing them.

## Cause 6: Node core modules in webpack 5

`Can't resolve 'crypto'`, `'stream'`, `'buffer'`, `'path'`, `'fs'` with the "BREAKING CHANGE: webpack < 5 used to include polyfills" message means browser code imports a Node module. Best fix: use a browser-compatible library or update it. Otherwise add fallbacks:

```bash
npm install -D crypto-browserify stream-browserify buffer
```

```js
module.exports = {
  resolve: {
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      fs: false,          // no browser equivalent
    },
  },
};
```

In Create React App you need `craco` or `react-app-rewired` to edit the config. In Next.js, `fs` errors mean server-only code was imported into a client component — keep it in server code.

## Still failing?

Delete caches and restart: `rm -rf node_modules/.cache .next` and re-run the dev server.
