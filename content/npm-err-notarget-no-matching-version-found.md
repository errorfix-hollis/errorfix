---
error: "npm ERR! notarget No matching version found for"
error_full: |
  npm ERR! code ETARGET
  npm ERR! notarget No matching version found for react-scripts@6.0.0.
  npm ERR! notarget In most cases you or one of your dependencies are requesting
  npm ERR! notarget a package version that doesn't exist.
cat: npm
description: "npm found the package on the registry, but no published version satisfies the requested version or range. Typically a typo in the version, a version that isn't published yet (or was unpublished), a stale cache, or a private registry/mirror that lacks it."
tldr: "List real versions with `npm view <pkg> versions --json` and fix the version in package.json (or `npm install <pkg>@latest`). If the version does exist, clear stale metadata with `npm cache clean --force` and check which registry you use: `npm config get registry` (scoped packages may need `@scope:registry=` in .npmrc)."
keywords: npm err notarget no matching version found for etarget code etarget package version doesn't exist npm view versions npm cache clean registry npmrc private registry verdaccio
related: [npm-err-code-e404, npm-eresolve-unable-to-resolve-dependency-tree, npm-err-code-eintegrity]
---
## What it means

`ETARGET` is different from `E404`: the package name exists, but none of its published versions match what was asked for. The message names the exact `package@range` that failed; it may be a transitive dependency rather than one in your own `package.json`.

Check what exists:

```bash
npm view react-scripts versions --json     # every published version
npm view react-scripts dist-tags           # latest, next, beta...
```

## Cause 1: the version doesn't exist (typo or wishful version)

`"react-scripts": "^6.0.0"` when the latest is 5.0.1, or `1.2.3` instead of `1.2.4`. Fix the version, or let npm pick the newest:

```bash
npm install react-scripts@latest
npm install some-lib@5        # newest 5.x.x
```

Dist-tags must exist too: `pkg@next` fails if there is no `next` tag.

## Cause 2: the version was just published

New releases may take a few minutes to appear on all registry mirrors and in your local metadata cache. Clear it and retry:

```bash
npm cache clean --force
npm install
```

npm also caches package metadata for a while; `npm install --prefer-online` forces a fresh check.

## Cause 3: wrong registry or a mirror that lacks it

```bash
npm config get registry
cat .npmrc ~/.npmrc 2>/dev/null
```

If a company Artifactory/Nexus/Verdaccio proxy or a regional mirror (e.g. npmmirror) is configured, it may not have synced that version, or may block it. Try the public registry once to confirm:

```bash
npm view some-lib@1.4.2 --registry=https://registry.npmjs.org/
```

For private scoped packages, make sure the scope points to the right registry:

```ini
# .npmrc
@mycompany:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Without that line npm looks for `@mycompany/*` on the public registry, which doesn't have your versions.

## Cause 4: a lockfile or dependency points to an unpublished version

A version can be deprecated or (within 72 hours of publishing) unpublished. If the failing package is transitive, find who requests it:

```bash
npm ls some-lib
npm explain some-lib
```

Upgrade the parent package, or force a version with `overrides` in package.json:

```json
{
  "overrides": {
    "some-lib": "1.4.3"
  }
}
```

If `package-lock.json` references a version that no longer exists, delete the lock entry (or the whole lockfile and `node_modules`) and run `npm install` again.

## Cause 5: prerelease versions

Ranges like `^2.0.0` don't match prereleases such as `2.1.0-beta.1`. Request the prerelease explicitly (`npm install pkg@2.1.0-beta.1` or `pkg@beta`).
