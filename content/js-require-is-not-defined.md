---
error: "ReferenceError: require is not defined"
error_full: "ReferenceError: require is not defined in ES module scope, you can use import instead"
cat: javascript
description: require() only exists in CommonJS. In ES modules and browsers, use import, or create require with createRequire.
tldr: "Replace `const x = require('x')` with `import x from 'x'`. Need require in ESM? Use `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`."
keywords: require is not defined es module scope browser import node type module
related: [node-cannot-use-import-statement-outside-a-module]
---
## What it means

`require` is a function Node provides to **CommonJS** files only. It doesn't exist in:

- ES module files in Node (`"type": "module"` in `package.json`, or `.mjs`)
- the browser

## Fix in Node: use import

```js
// before
const fs = require('fs');
const { join } = require('path');

// after
import fs from 'fs';
import { join } from 'path';
```

JSON files: `import data from './data.json' with { type: 'json' };` (Node 22+), or read them with `fs`.

## Fix in Node: keep using require inside ESM

```js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const legacy = require('./legacy.cjs');
```

## Fix in Node: go back to CommonJS

Remove `"type": "module"` from `package.json`, or rename this file to `.cjs`.

## Fix in the browser

Browsers have no `require`. Either:

- use `<script type="module">` and `import` from URLs or relative paths, or
- bundle your code with a bundler (Vite, esbuild, webpack) that turns `require` calls into browser code.
