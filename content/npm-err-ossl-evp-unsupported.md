---
error: "Error: error:0308010C:digital envelope routines::unsupported"
error_full: |
  Error: error:0308010C:digital envelope routines::unsupported
      at new Hash (node:internal/crypto/hash:69:19)
      at Object.createHash (node:crypto:133:10)
      at module.exports (/app/node_modules/webpack/lib/util/createHash.js:135:53)
  {
    opensslErrorStack: [ 'error:03000086:digital envelope routines::initialization error' ],
    library: 'digital envelope routines',
    reason: 'unsupported',
    code: 'ERR_OSSL_EVP_UNSUPPORTED'
  }
cat: npm
description: An old webpack (often via react-scripts 4 or Vue CLI 4) uses the MD4 hash, which OpenSSL 3 in Node 17+ disables. Upgrade webpack/react-scripts, or use the legacy OpenSSL provider.
tldr: "Best: upgrade the build tool (`npm install react-scripts@latest` or webpack 5.61+). Quick workaround: `export NODE_OPTIONS=--openssl-legacy-provider` before `npm start`."
keywords: err_ossl_evp_unsupported 0308010C digital envelope routines unsupported webpack react-scripts node 17 18 openssl legacy provider
related: [npm-eresolve-unable-to-resolve-dependency-tree]
---
## What it means

Node.js 17 and later ship with **OpenSSL 3**, which disables old hash algorithms such as MD4 by default. Webpack 4 (and early webpack 5) uses MD4 to hash files, so the build crashes.

Typical setups that hit this: Create React App with `react-scripts` 4, Vue CLI 4, Angular 11 or older, Gatsby 2/3, Storybook 6 on webpack 4.

## Fix 1: upgrade the tooling (best)

```bash
npm install react-scripts@latest      # Create React App
npm install webpack@latest            # plain webpack (5.61+ has its own MD4)
```

For Vue CLI, Angular or Next.js, upgrade to a version that supports Node 18+.

## Fix 2: enable the legacy OpenSSL provider

Linux/macOS:

```bash
export NODE_OPTIONS=--openssl-legacy-provider
npm start
```

Windows PowerShell:

```powershell
$env:NODE_OPTIONS="--openssl-legacy-provider"
npm start
```

Or put it in `package.json` scripts (works for Linux/macOS shells):

```json
"scripts": {
  "start": "NODE_OPTIONS=--openssl-legacy-provider react-scripts start",
  "build": "NODE_OPTIONS=--openssl-legacy-provider react-scripts build"
}
```

For cross-platform scripts use `cross-env`: `"start": "cross-env NODE_OPTIONS=--openssl-legacy-provider react-scripts start"`.

If you get `node: --openssl-legacy-provider is not allowed in NODE_OPTIONS`, your Node is older than 17 and doesn't need the flag. Remove it.

## Fix 3: use Node 16

Running an old project with nvm: `nvm install 16 && nvm use 16`. Node 16 is end-of-life and no longer gets security fixes, so treat this as temporary.
