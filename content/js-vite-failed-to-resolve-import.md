---
error: "[plugin:vite:import-analysis] Failed to resolve import"
error_full: |
  [plugin:vite:import-analysis] Failed to resolve import "@/components/Button" from "src/App.tsx". Does the file exist?
cat: javascript
description: "Vite could not map an import path to a file or installed package. Usually a typo or wrong case in the path, a missing npm package, or a path alias (like @/) defined in tsconfig but not in vite.config."
tldr: "Check the path and file name case. For a package, run `npm install <pkg>`. For `@/` aliases add `resolve: { alias: { '@': path.resolve(__dirname, './src') } }` to vite.config (or use the `vite-tsconfig-paths` plugin), then restart the dev server."
keywords: vite failed to resolve import does the file exist plugin vite import-analysis alias @ tsconfig paths vite.config resolve.alias react vue
related: [js-module-not-found-error-cant-resolve, js-ts2307-cannot-find-module-or-its-corresponding-type-declarations, node-cannot-find-module]
---
## What it means

Vite's `import-analysis` plugin rewrites every import in your source. For each specifier it asks the resolver: is this a relative file, an alias, or a package in `node_modules`? If none matches, you get this overlay. It is Vite's version of webpack's [Module not found: Can't resolve](/javascript/js-module-not-found-error-cant-resolve/).

## Cause 1: path alias only configured in TypeScript

`tsconfig.json` `paths` are only used by the TypeScript type checker. Vite does not read them by default, so the editor is happy but the dev server fails.

**Fix:** declare the alias in `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Keep `tsconfig.json` in sync:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Or install `vite-tsconfig-paths` and add `tsconfigPaths()` to `plugins` so Vite reads the tsconfig paths itself. If `__dirname` is undefined (ESM config), use `fileURLToPath(new URL('./src', import.meta.url))`.

Restart `npm run dev` after editing the config.

## Cause 2: the package isn't installed

If the specifier is a bare name (`"axios"`, `"@tanstack/react-query"`), it must exist in `node_modules`:

```bash
npm ls axios        # is it installed?
npm install axios
```

After switching branches or pulling, run `npm install` again. If it's installed but still fails, clear Vite's pre-bundle cache:

```bash
rm -rf node_modules/.vite
npm run dev -- --force
```

## Cause 3: typo, wrong case or wrong extension

- `./components/button` vs `Button.tsx`: macOS/Windows file systems are case-insensitive, but Vite's resolver and Linux CI are not consistent with that. Match the exact case.
- Relative paths are relative to the importing file, not to the project root. `../` vs `./` is a common slip.
- Vite resolves `.mjs .js .mts .ts .jsx .tsx .json` without an extension, but **not** `.vue` or `.svelte` by default. Write `import Foo from './Foo.vue'`.
- Importing a folder works only if it contains `index.ts`/`index.js`.

## Cause 4: the package's exports don't include that path

Deep imports like `import x from 'some-lib/dist/utils'` fail if the package's `package.json` has an `exports` field that doesn't list that subpath. Use the documented entry point (`import { utils } from 'some-lib'`) or a listed subpath export.

## Cause 5: monorepo / linked packages

With workspaces or `npm link`, the linked package may need to be built first (its `main`/`exports` point to `dist/`, which doesn't exist yet). Run its build, or point an alias at its source folder. Also check `server.fs.allow` if Vite refuses to serve files outside the project root.
