---
error: "npm ERR! Missing script: \"start\""
error_full: |
  npm ERR! Missing script: "start"
  npm ERR!
  npm ERR! Did you mean one of these?
  npm ERR!     npm star # Mark your favorite packages
  npm ERR!     npm stars # View packages marked as favorites
  npm ERR!
  npm ERR! To see a list of scripts, run:
  npm ERR!   npm run
cat: npm
description: "`npm start` (or `npm run <name>`) looks up the script in the `scripts` section of package.json in the current directory, and it isn't there. You're in the wrong folder, the script has a different name (e.g. `dev`), or package.json has no scripts."
tldr: "Run `npm run` to list the available scripts, then use the right one (Vite/Next projects use `npm run dev`). Make sure you're in the folder that contains the project's package.json (`ls package.json`). Or add the script: `\"scripts\": { \"start\": \"node index.js\" }`."
keywords: npm err missing script start npm start missing script dev build serve package.json scripts npm run list wrong directory vite next react node index.js npm error
related: [npm-enoent-package-json, npm-elifecycle, npm-sh-vite-not-found]
---
## What it means

`npm start` is shorthand for `npm run start`. npm reads `package.json` in the **current directory** and looks for `scripts.start`. If it's missing, npm stops with this error and suggests similarly named commands (the `npm star` hint is just fuzzy matching — ignore it). Newer npm prints `npm error Missing script: "start"`.

See what's actually available:

```bash
pwd
npm run          # lists every script in this package.json
cat package.json
```

## Cause 1: the project uses a different script name

Most modern templates don't define `start` for development:

| Project | Dev command |
|---|---|
| Vite (React, Vue, Svelte) | `npm run dev` |
| Next.js | `npm run dev` (`npm start` only serves a production build) |
| Create React App | `npm start` |
| Angular CLI | `npm start` (runs `ng serve`) |
| Vue CLI | `npm run serve` |
| Nuxt / Astro / SvelteKit | `npm run dev` |

So for Vite: `npm run dev`. Only `start`, `test`, `stop` and `restart` can be run without `run`; everything else needs `npm run <name>`.

## Cause 2: wrong directory

If you cloned a repo with `frontend/` and `backend/` folders, the root `package.json` may have no scripts (or not exist — then you get `ENOENT ... package.json`). Change into the right folder:

```bash
cd frontend
npm install
npm run dev
```

In monorepos with workspaces, run it from the root with `npm run dev --workspace=frontend` (or `-w frontend`).

## Cause 3: package.json has no start script (Node apps)

A plain Node project created with `npm init -y` only has a `test` script. Add one:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  }
}
```

Use the file that's really your entry point (`server.js`, `app.js`, `dist/index.js`...). If there's **no** `scripts.start` but a `server.js` exists in the folder, npm runs `node server.js` by default — so this error also means there's no `server.js`.

You can add scripts from the command line too:

```bash
npm pkg set scripts.start="node index.js"
```

## Cause 4: deployment platform runs npm start

Heroku, Render, Railway, Azure App Service and many Docker images run `npm start` by default. Make sure `start` launches the **production** server and isn't a dev server:

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js"
}
```

For a static frontend (Vite/CRA build output) you usually don't need `npm start` at all — serve the `dist/` or `build/` folder as static files, or configure the platform's start command explicitly.

## Cause 5: invalid or duplicated package.json

If `scripts` appears twice, the later one wins and the first is silently ignored. If the JSON is broken, npm reports `EJSONPARSE` instead. Check it with the [JSON formatter](/tools/json-formatter/) or `node -e "require('./package.json')"`.
