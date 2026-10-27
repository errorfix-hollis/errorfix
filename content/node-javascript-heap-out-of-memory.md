---
error: "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory"
error_full: |
  <--- Last few GCs --->
  [12345:0x5a1b2c0]    81234 ms: Mark-Compact 4049.2 (4135.6) -> 4036.8 (4137.1) MB

  FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
   1: 0xb090e0 node::Abort() [node]
cat: npm
description: Node's V8 engine ran out of the heap memory it is allowed to use. Common during big webpack/Vite/Next.js/TypeScript builds. Raise the limit with --max-old-space-size or reduce memory usage.
tldr: "Raise the heap limit: `export NODE_OPTIONS=\"--max-old-space-size=4096\"` (value in MB), then rerun the build. If memory grows forever in a running app, you have a leak; take a heap snapshot."
keywords: node javascript heap out of memory fatal error reached heap limit allocation failed max-old-space-size NODE_OPTIONS webpack next build ineffective mark-compacts
related: [npm-elifecycle, npm-err-ossl-evp-unsupported]
---
## What it means

V8 caps how much memory JavaScript objects can use (the "old space"). The default depends on Node version and system memory, often 2–4 GB. When a process needs more, Node aborts with this error.

## Fix for builds: raise the limit

Linux / macOS:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

Windows PowerShell:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

Or put it in `package.json` (use `cross-env` for Windows compatibility):

```json
"scripts": {
  "build": "cross-env NODE_OPTIONS=--max-old-space-size=4096 next build"
}
```

Pick a value below your machine's free RAM. On a 2 GB CI runner or container, 4096 will just get the process killed by the OS instead (exit code 137); give the machine more memory or use a smaller value.

## Reduce build memory

- **TypeScript**: `fork-ts-checker-webpack-plugin` or `tsc --noEmit` in a separate step instead of type-checking inside the bundler.
- **Source maps**: disable or use cheaper ones in production builds (`devtool: false`, `productionBrowserSourceMaps: false`).
- **Monorepos**: build packages one at a time instead of in parallel (`--concurrency 1` in Turborepo/Nx/Lerna).
- **Update** Node, webpack/Vite and the framework; many memory issues are fixed upstream.

## Fix for a running server: find the leak

If memory grows steadily until the crash, raising the limit only delays it. Typical leaks: caches/maps that never evict, event listeners added per request, global arrays that collect data.

```bash
node --inspect app.js
```

Open `chrome://inspect`, take two heap snapshots a few minutes apart and compare which objects keep growing. `node --heapsnapshot-near-heap-limit=2 app.js` writes snapshots automatically right before the crash.

## Large data processing

Reading a huge file or query result into one array/string needs it all in memory. Stream it instead (`fs.createReadStream`, `readline`, database cursors, `JSON` stream parsers).
