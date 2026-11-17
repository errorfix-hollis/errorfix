---
error: "react-scripts: not found"
error_full: |
  > my-app@0.1.0 start
  > react-scripts start

  sh: 1: react-scripts: not found
cat: npm
description: "npm ran the `start`/`build` script but the `react-scripts` binary isn't in node_modules/.bin. Almost always the dependencies were never installed, the install failed, or node_modules is broken."
tldr: "Run `npm install` in the project folder (where package.json is), then `npm start`. If it's still missing, reinstall cleanly: `rm -rf node_modules package-lock.json && npm install`, or add it explicitly: `npm install react-scripts --save`. On Windows the message is `'react-scripts' is not recognized as an internal or external command`."
keywords: react-scripts not found sh 1 react-scripts not found is not recognized as an internal or external command npm start create react app node_modules npm install
related: [npm-elifecycle, npm-eresolve-unable-to-resolve-dependency-tree, node-cannot-find-module]
---
## What it means

`npm start` runs the `"start": "react-scripts start"` entry from `package.json`. npm puts `node_modules/.bin` on the `PATH` for scripts, so `react-scripts` must exist at `node_modules/.bin/react-scripts`. If it doesn't, the shell reports:

- Linux/macOS: `sh: 1: react-scripts: not found` or `sh: react-scripts: command not found`
- Windows: `'react-scripts' is not recognized as an internal or external command, operable program or batch file.`

npm then reports the failure as `ELIFECYCLE` / `code 127`.

## Fix 1: install dependencies

Freshly cloned repos don't include `node_modules`:

```bash
cd my-app            # the folder that contains package.json
npm install
npm start
```

Use the project's package manager if it has a lock file: `yarn` (yarn.lock) or `pnpm install` (pnpm-lock.yaml).

## Fix 2: the install failed or node_modules is broken

Scroll up in the `npm install` output: an `ERESOLVE` or network error means the install never completed. Then reinstall cleanly:

```bash
rm -rf node_modules package-lock.json
npm cache verify
npm install
```

On Windows PowerShell: `Remove-Item -Recurse -Force node_modules, package-lock.json`.

If `npm install` fails with `ERESOLVE unable to resolve dependency tree` (common with old CRA projects on React 18/19), see [ERESOLVE](/npm/npm-eresolve-unable-to-resolve-dependency-tree/); `npm install --legacy-peer-deps` usually gets it through.

## Fix 3: react-scripts isn't in package.json

Check:

```bash
npm ls react-scripts
grep react-scripts package.json
```

If it's missing (deleted by accident, or the project was ejected), add it:

```bash
npm install react-scripts --save
```

## Fix 4: NODE_ENV=production skipped it

`npm install` skips `devDependencies` when `NODE_ENV=production` is set or with `--omit=dev`. If `react-scripts` is listed under `devDependencies` (common in some templates), it won't be installed in CI or Docker. Install with dev deps for the build:

```bash
NODE_ENV=development npm ci
npm run build
```

In a Dockerfile, run `npm ci` before setting `ENV NODE_ENV=production`, or move `react-scripts` to `dependencies`.

## Fix 5: Docker bind mount hides node_modules

`docker compose` with `volumes: - .:/app` replaces the image's `/app/node_modules` with your host folder (which may be empty). Add an anonymous volume so the container keeps its own:

```yaml
volumes:
  - .:/app
  - /app/node_modules
```

## Fix 6: permission or path problems

- `sh: 1: react-scripts: Permission denied` means the file exists but isn't executable (e.g. copied from Windows): `chmod +x node_modules/.bin/react-scripts`, or just reinstall.
- A project path containing `&`, `#` or similar on Windows can break `.bin` shims; move it to a simple path like `C:\dev\my-app`.

## Consider migrating

Create React App is deprecated (officially since February 2025) and `react-scripts` hasn't kept up with React 19. For new work, use Vite: `npm create vite@latest my-app -- --template react`.
