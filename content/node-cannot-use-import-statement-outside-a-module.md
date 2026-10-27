---
error: "SyntaxError: Cannot use import statement outside a module"
cat: javascript
description: "Node (or a test runner) is treating your file as CommonJS. Set \"type\": \"module\", use .mjs, or switch to require()."
tldr: "Add `\"type\": \"module\"` to your `package.json` (or rename the file to `.mjs`). In the browser, use `<script type=\"module\">`."
keywords: cannot use import statement outside a module node jest browser script type module es6 import
related: [node-err-module-not-found, js-require-is-not-defined]
---
## What it means

`import` only works in **ES modules**. Your file is being loaded as a classic script (browser) or as CommonJS (Node), where `import` is a syntax error.

## In Node.js

Pick one:

```json
// package.json
{
  "type": "module"
}
```

- or rename the file from `.js` to `.mjs`
- or keep CommonJS and use `const x = require('x')` instead of `import`

After switching to ESM, relative imports need extensions (`./file.js`) and `__dirname` is no longer defined. Use `import.meta.dirname` (Node 20.11+) instead.

## In the browser

```html
<script type="module" src="main.js"></script>
```

Modules must be served over HTTP(S). Opening the HTML file directly with `file://` blocks module loading (you'll get a CORS error instead). Run a local server such as `npx serve` or `python3 -m http.server`.

## In Jest

Jest uses CommonJS by default. Either use Babel (`babel-jest` with `@babel/preset-env`), `ts-jest` for TypeScript, or run Jest in native ESM mode:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js
```

If the error comes from a package inside `node_modules` that ships only ESM, add it to `transformIgnorePatterns` exceptions so Babel transforms it:

```js
transformIgnorePatterns: ['node_modules/(?!(some-esm-package)/)']
```

Alternatively, switch to Vitest, which supports ESM natively.

## In TypeScript with ts-node

Set `"module": "commonjs"` in `tsconfig.json`, or use `tsx` instead of `ts-node`, which handles both module types.
