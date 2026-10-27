---
error: "npm ERR! code ELIFECYCLE"
error_full: |
  npm ERR! code ELIFECYCLE
  npm ERR! errno 1
  npm ERR! my-app@1.0.0 start: `node server.js`
  npm ERR! Exit status 1
  npm ERR!
  npm ERR! Failed at the my-app@1.0.0 start script.
cat: npm
description: An npm script exited with an error. ELIFECYCLE itself is not the problem — the real error is printed above it.
tldr: "Scroll up: the real error is in the output *before* the `npm ERR!` lines. Fix that. If it's a dependency problem, try `rm -rf node_modules package-lock.json && npm install`."
keywords: npm err code elifecycle errno 1 exit status failed at the start script npm run build
related: [node-cannot-find-module, npm-enoent-package-json]
---
## What it means

npm ran one of your `package.json` scripts (here `start`) and the command **exited with a non-zero code**. npm just reports that. Newer npm versions print `npm ERR! Lifecycle script "start" failed` or `npm error code 1` for the same thing.

## Step 1: find the real error

Look at the lines **above** the `npm ERR!` block. Common ones:

- `Error: Cannot find module ...` → see [Cannot find module](/npm/node-cannot-find-module/)
- `EADDRINUSE` → see [address already in use](/linux/linux-address-already-in-use/)
- `SyntaxError ...` → a bug in your code or an unsupported Node version
- `sh: 1: react-scripts: not found` → dependencies not installed: `npm install`
- `JavaScript heap out of memory` → `NODE_OPTIONS=--max-old-space-size=4096 npm run build`

## Step 2: run the command directly

Copy the command shown after the script name and run it yourself, e.g.:

```bash
node server.js
npx react-scripts build
```

The output is often clearer without npm in between.

## Step 3: reinstall dependencies

```bash
rm -rf node_modules package-lock.json
npm cache verify
npm install
```

Keep `package-lock.json` if your team relies on it; then just delete `node_modules` and run `npm ci`.

## Step 4: check the Node version

Many projects specify one in `package.json` (`"engines"`) or `.nvmrc`. Check `node -v` and switch with `nvm use` if needed.
