---
error: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module"
error_full: |
  node:internal/errors:496
      ErrorCaptureStackTrace(err);
      ^

  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/user/app/src/utils' imported from /home/user/app/src/index.js
cat: npm
description: In ES modules, Node needs the full file path including the .js extension. Add the extension to your import or install the missing package.
tldr: "Add the file extension to relative imports: `import x from './utils.js'`, not `'./utils'`. For package names, run `npm install <package>`."
keywords: err_module_not_found esm import extension node type module imported from did you mean
related: [node-cannot-find-module, node-cannot-use-import-statement-outside-a-module]
---
## What it means

You're using **ES modules** (`import`/`export`, with `"type": "module"` in `package.json` or a `.mjs` file). The ESM loader doesn't guess extensions or look for `index.js` in folders like `require()` does.

## Fix 1: add the extension

```js
// fails
import { helper } from './utils';
import config from './config';

// works
import { helper } from './utils.js';
import config from './config/index.js';
```

**TypeScript:** write `.js` in your imports even though the source file is `.ts`. TypeScript rewrites nothing; with `"module": "NodeNext"` it understands that `./utils.js` refers to `./utils.ts`.

## Fix 2: install the package

If the message names a package (`Cannot find package 'lodash'`):

```bash
npm install lodash
```

## Fix 3: run TypeScript directly

If the missing file is `.ts`, plain `node` can't load it on older versions. Use `npx tsx src/index.ts`, build first with `tsc`, or on Node 22.6+ try `node --experimental-strip-types` (on by default since Node 23.6).

## Fix 4: you didn't mean to use ESM

Remove `"type": "module"` from `package.json` and use `require()`, or rename files to `.cjs`.
