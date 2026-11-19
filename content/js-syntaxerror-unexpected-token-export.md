---
error: "SyntaxError: Unexpected token 'export'"
error_full: |
  /home/me/app/node_modules/some-lib/index.js:1
  export default function foo() {
  ^^^^^^

  SyntaxError: Unexpected token 'export'
      at internalCompileFunction (node:internal/vm:76:18)
      at wrapSafe (node:internal/modules/cjs/loader:1283:20)
cat: javascript
description: "ES module syntax (`export`/`import`) is being run by something that treats the file as a classic script or CommonJS: Node without `\"type\": \"module\"`, a browser `<script>` without `type=\"module\"`, or Jest without transforming ESM dependencies."
tldr: "In Node, add `\"type\": \"module\"` to package.json or rename the file to `.mjs`. In the browser, load it with `<script type=\"module\" src=\"app.js\"></script>`. In Jest, transform the ESM package: `transformIgnorePatterns: ['/node_modules/(?!some-lib)']`, or use Vitest."
keywords: syntaxerror unexpected token export javascript node jest es module commonjs type module mjs script type module transformignorepatterns next.js typescript ts-node
related: [node-cannot-use-import-statement-outside-a-module, js-require-is-not-defined, node-err-require-esm]
---
## What it means

`export` is only valid inside an **ES module**. When the engine parses a file as a classic script (browser) or CommonJS (Node), `export` is an unknown token at the very first line and parsing stops. It's the sibling of `Cannot use import statement outside a module`.

Look at the file in the stack trace: is it your code, or a file inside `node_modules`? That decides the fix.

## Cause 1: Node treats your file as CommonJS

Node uses CommonJS for `.js` files unless the nearest `package.json` says otherwise.

**Fix A:** declare the package as ESM:

```json
{
  "type": "module"
}
```

Then use `import`/`export` everywhere, and include file extensions in relative imports (`import { x } from './utils.js'`).

**Fix B:** rename just that file to `.mjs` (ESM) — or, if the rest of your project is CommonJS, rewrite the export:

```js
// ESM
export function add(a, b) { return a + b; }
// CommonJS equivalent
function add(a, b) { return a + b; }
module.exports = { add };
```

Newer Node versions (22.7+ / 23) can auto-detect ESM syntax in ambiguous `.js` files, but relying on that is slower and noisier than setting `"type"`.

## Cause 2: browser script without type="module"

```html
<!-- Wrong -->
<script src="app.js"></script>
<!-- Right -->
<script type="module" src="app.js"></script>
```

Module scripts must be served over HTTP(S) — opening `index.html` via `file://` causes CORS errors instead. Use any local server (`npx serve`, `python3 -m http.server`).

## Cause 3: Jest and ESM-only packages

Jest (with babel-jest) doesn't transform `node_modules` by default. When a dependency ships only ESM (e.g. `nanoid`, `uuid` in some versions, `lodash-es`, `d3`), tests fail with this error in a `node_modules` path.

```js
// jest.config.js
module.exports = {
  transformIgnorePatterns: ['/node_modules/(?!(lodash-es|nanoid)/)'],
};
```

You also need a Babel config that converts ESM (`@babel/preset-env`). Alternatives: map the module to its CommonJS build with `moduleNameMapper` (e.g. `'^lodash-es$': 'lodash'`), run Jest in native ESM mode (`node --experimental-vm-modules node_modules/.bin/jest`), or switch to Vitest, which handles ESM natively.

## Cause 4: TypeScript compiled to the wrong module format

If `tsc` output keeps `export` but Node loads it as CommonJS (or vice versa), align `tsconfig.json` with `package.json`:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

With `"module": "NodeNext"`, TypeScript emits ESM or CommonJS based on the `"type"` field and file extension, so they can't disagree. For `ts-node`, use `node --loader ts-node/esm` or a runner like `tsx`.

## Cause 5: Next.js importing an ESM-only package

Older Next.js versions may not transpile a dependency. Add it to `transpilePackages`:

```js
// next.config.js
module.exports = { transpilePackages: ['some-lib'] };
```

## Check what a package ships

```bash
cat node_modules/some-lib/package.json | grep -E '"(type|main|module|exports)"'
```

`"type": "module"` with no `require` condition in `exports` means the package is ESM-only — you must import it from ESM, or use dynamic `await import('some-lib')` from CommonJS.
