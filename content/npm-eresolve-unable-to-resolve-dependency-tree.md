---
error: "npm ERR! code ERESOLVE unable to resolve dependency tree"
error_full: |
  npm ERR! code ERESOLVE
  npm ERR! ERESOLVE unable to resolve dependency tree
  npm ERR!
  npm ERR! While resolving: my-app@0.1.0
  npm ERR! Found: react@18.2.0
  npm ERR! Could not resolve dependency:
  npm ERR! peer react@"^16.8.0 || ^17.0.0" from some-library@1.4.0
cat: npm
description: A package's peer dependency doesn't match the version you have installed. Upgrade the package, or install with --legacy-peer-deps.
tldr: "Look for a newer version of the package named in `Could not resolve dependency` that supports your version. If none exists, run `npm install --legacy-peer-deps`."
keywords: npm install eresolve peer dependency conflict legacy-peer-deps force react
related: [npm-eacces-permission-denied]
---
## What it means

Since npm 7, `npm install` enforces **peer dependencies**. One of your packages says "I only work with react 16 or 17", but your project has react 18, so npm refuses to build a tree that breaks that promise.

## How to read the message

- `Found: react@18.2.0` is what you have.
- `peer react@"^16.8.0 || ^17.0.0" from some-library@1.4.0` is the package that complains and the versions it accepts.

## Fix 1: upgrade the package that complains (best)

```bash
npm view some-library peerDependencies
npm view some-library versions --json
npm install some-library@latest
```

Newer releases often widen their peer range. Check the package's changelog or GitHub issues for "react 18 support" (or whatever your conflict is).

## Fix 2: install with legacy peer resolution

This makes npm behave like npm 6: it installs anyway and ignores peer conflicts.

```bash
npm install --legacy-peer-deps
```

To make it permanent for the project (so teammates and CI behave the same):

```bash
echo "legacy-peer-deps=true" >> .npmrc
```

The package may still work fine, or it may break at runtime. Test it.

## Fix 3: --force

```bash
npm install --force
```

`--force` also installs, but it fetches the conflicting peer versions too, which can put duplicate copies in `node_modules`. Prefer `--legacy-peer-deps`.

## Fix 4: override the version

npm 8.3+ supports `overrides` in `package.json` to force one version everywhere:

```json
{
  "overrides": {
    "some-library": { "react": "$react" }
  }
}
```

`$react` means "use the version from my own dependencies".

## Still stuck?

Delete the lock state and retry. Stale lockfiles sometimes pin old versions:

```bash
rm -rf node_modules package-lock.json
npm install
```
