---
error: "sh: vite: not found"
error_full: |
  > my-app@0.0.0 dev
  > vite

  sh: 1: vite: not found
cat: npm
description: "An npm script runs a CLI (vite, next, tsc, nodemon...) from node_modules/.bin, but it isn't there. Dependencies were never installed, were installed without devDependencies, or node_modules is broken."
tldr: "Run `npm install` in the project folder (the one with package.json), then `npm run dev`. If it persists: `rm -rf node_modules package-lock.json && npm install`. Check that NODE_ENV isn't `production` (`npm install --include=dev`). In Docker, install deps inside the image and don't overwrite node_modules with a bind mount."
keywords: sh vite not found next not found tsc not found nodemon not found npm run dev node_modules bin devdependencies npm install docker vite command not found
related: [npm-react-scripts-not-found, npm-npx-command-not-found, npm-elifecycle]
---
## What it means

`npm run <script>` adds `./node_modules/.bin` to `PATH` and runs the command with `sh`. `vite: not found` (also `next: not found`, `tsc: not found`, `nodemon: not found`, `'vite' is not recognized...` on Windows) means there is no `node_modules/.bin/vite`. The script itself is fine; the package isn't installed where npm looks.

Check quickly:

```bash
ls node_modules/.bin/vite
npm ls vite
```

## Fix 1: install dependencies

After cloning a repo or pulling new changes:

```bash
npm install      # or: pnpm install / yarn
npm run dev
```

Run it in the folder that contains `package.json`. In monorepos, install at the workspace root.

## Fix 2: devDependencies were skipped

Vite, TypeScript and most build tools are in `devDependencies`. They are **not** installed when:

- `NODE_ENV=production` is set in your shell, `.env` loader, CI or Dockerfile
- you ran `npm install --production` / `npm ci --omit=dev`
- npm config has `omit=dev` (`npm config get omit`)

```bash
echo $NODE_ENV
npm install --include=dev
```

For a production Docker image, build in one stage with dev deps and copy only the output (`dist/`) to the final stage.

## Fix 3: broken or partial node_modules

An interrupted install, switching Node versions or switching package managers can leave `.bin` links missing:

```bash
rm -rf node_modules package-lock.json
npm cache verify
npm install
```

Only delete `package-lock.json` if you're fine with re-resolving versions; otherwise keep it and just remove `node_modules`, then run `npm ci`.

## Fix 4: package is missing from package.json

If `npm ls vite` shows `(empty)`, it was never added:

```bash
npm install -D vite
# next.js:
npm install next react react-dom
```

## Fix 5: Docker bind mount hides node_modules

With `volumes: - .:/app` in docker-compose, the host folder (which may have no `node_modules`, or one built for another OS) hides the one installed in the image. Add an anonymous volume so the container keeps its own:

```yaml
services:
  web:
    build: .
    volumes:
      - .:/app
      - /app/node_modules
```

And make sure the Dockerfile runs `npm install` *before* `CMD ["npm", "run", "dev"]`, with `COPY package*.json ./` first.

## Fix 6: permission or exec bit lost

Files copied from Windows, zipped, or on a `noexec` mount may lose the executable bit; the error then is `Permission denied` rather than `not found`. Reinstall on the target system, or `chmod +x node_modules/.bin/*`.

## Running it without a script

`npx vite` uses the local binary if present and otherwise offers to download it. That's handy for checking, but fix the install so `npm run dev` works for everyone.
