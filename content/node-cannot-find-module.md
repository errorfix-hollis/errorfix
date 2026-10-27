---
error: "Error: Cannot find module"
error_full: |
  node:internal/modules/cjs/loader:1228
    throw err;
    ^

  Error: Cannot find module 'express'
  Require stack:
  - /home/user/app/index.js
  code: 'MODULE_NOT_FOUND'
cat: npm
description: Node can't find a package or file you required. Install the dependency, fix the path, or check you're running from the right folder.
tldr: "If the name is a package (like `express`), run `npm install express`. If it's a path (like `./utils`), check spelling, case and the file extension."
keywords: node cannot find module module_not_found require stack npm install missing package path
related: [node-err-module-not-found, npm-eresolve-unable-to-resolve-dependency-tree]
---
## What it means

`require()` (or the entry file you passed to `node`) points to something that doesn't exist where Node looks.

## Case 1: a package name, e.g. `Cannot find module 'express'`

The package isn't installed in this project's `node_modules`.

```bash
npm install express
```

If it **is** listed in `package.json`, your `node_modules` is missing or broken:

```bash
rm -rf node_modules
npm install
```

Also check that you're running the command in the folder that contains `package.json`.

## Case 2: a relative path, e.g. `Cannot find module './utils'`

- Check spelling and **case**. macOS and Windows ignore case, Linux (and most servers and CI) don't: `./Utils.js` ≠ `./utils.js`.
- The path is relative to the file doing the `require`, not to your terminal's folder.
- Check that the file exists: `ls ./utils.js`.

## Case 3: the script itself, e.g. `Cannot find module '/home/user/app/server.js'`

You ran `node server.js` (or `npm start`) from the wrong directory, or the `main`/`start` entry in `package.json` points to a missing file. If you use TypeScript, you may need to build first (`npm run build`) so the `dist/` files exist.

## Case 4: a global package

Globally installed packages can't be `require`d from your project. Install it locally (`npm install name`) instead of with `-g`.

## Case 5: Docker

If `node_modules` exists on your machine but not in the container, make sure your Dockerfile runs `npm ci` and that a volume mount isn't hiding `/app/node_modules`. A common fix is an extra anonymous volume: `-v /app/node_modules`.
