---
error: "npm WARN EBADENGINE Unsupported engine"
error_full: |
  npm WARN EBADENGINE Unsupported engine {
  npm WARN EBADENGINE   package: 'vite@6.0.0',
  npm WARN EBADENGINE   required: { node: '^18.0.0 || ^20.0.0 || >=22.0.0' },
  npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
  npm WARN EBADENGINE }
cat: npm
description: "A package declares in its `engines` field that it needs a different Node.js (or npm) version than the one you're running. It's a warning by default, but the package may really fail on your Node version."
tldr: "Compare `required` with `current`, then upgrade Node to a matching version: `nvm install 22 && nvm use 22` (or `fnm`, or the installer from nodejs.org), delete `node_modules` and `package-lock.json` if needed, and run `npm install` again. If it's an error (`EBADENGINE` with `engine-strict`), that's the same fix."
keywords: npm warn ebadengine unsupported engine required current node version engines package.json nvm upgrade node engine-strict
related: [npm-eresolve-unable-to-resolve-dependency-tree, npm-warn-deprecated, npm-err-ossl-evp-unsupported]
---
## What it means

Packages can declare which runtimes they support in `package.json`:

```json
"engines": { "node": ">=18" }
```

During `npm install`, npm compares that range with your Node and npm versions. If they don't match, it prints `EBADENGINE` with three useful lines:

- `package` — which dependency complained
- `required` — the versions it supports
- `current` — what you have

By default it's only a **warning** and installation continues. But the authors are telling you the package uses features your Node doesn't have, so expect errors like `SyntaxError: Unexpected token '?'`, `fetch is not defined`, or `structuredClone is not defined` at runtime.

## Fix 1: upgrade Node.js (the real fix)

Check your version:

```bash
node -v
npm -v
```

With **nvm** (Linux/macOS):

```bash
nvm install 22        # or the version the "required" range wants
nvm use 22
nvm alias default 22
```

With **fnm**: `fnm install 22 && fnm use 22`. On Windows use **nvm-windows** (`nvm install 22.11.0`, `nvm use 22.11.0`) or the installer from nodejs.org.

Then reinstall so native modules are rebuilt for the new Node:

```bash
rm -rf node_modules
npm install
```

Pin the version for your team with an `.nvmrc` file (`echo 22 > .nvmrc`, then `nvm use`) and an `engines` field in your own `package.json`.

## Fix 2: the warning is about npm, not Node

If `required` contains `npm: '>=9'`, update npm:

```bash
npm install -g npm@latest
```

Each Node release bundles a specific npm; upgrading Node often fixes this too.

## Fix 3: CI or Docker uses an old Node

Locally it works, but CI prints `EBADENGINE`. Set the version explicitly:

```yaml
# GitHub Actions
- uses: actions/setup-node@v4
  with:
    node-version: 22
```

```dockerfile
FROM node:22-alpine
```

Old base images like `node:16` are end-of-life and trigger this warning for most current packages.

## Fix 4: you can't upgrade Node right now

Install an older version of the package that still supports your Node. Look at the `engines` history:

```bash
npm view vite@5 engines
npm install vite@5
```

## When it's an error, not a warning

If your project or `.npmrc` sets `engine-strict=true`, npm fails with `npm ERR! code EBADENGINE`. Yarn and pnpm also check engines (`The engine "node" is incompatible with this module`). Upgrading Node is still the right fix. You can bypass the check with `npm install --engine-strict=false` (or `yarn --ignore-engines`), but only do that when you know the package works.
