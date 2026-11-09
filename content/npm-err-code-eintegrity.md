---
error: "npm ERR! code EINTEGRITY"
error_full: |
  npm ERR! code EINTEGRITY
  npm ERR! sha512-AbC...== integrity checksum failed when using sha512: wanted sha512-AbC...== but got sha512-XyZ...==. (12345 bytes)
cat: npm
description: "The tarball npm downloaded (or found in its cache) doesn't match the integrity hash recorded in package-lock.json. Usually a corrupted cache, a lock file created against a different registry, or a proxy altering downloads."
tldr: "Verify/clean the cache: `npm cache verify` (or `npm cache clean --force`), then `npm install`. If it persists, the lock file hash is from another registry/mirror: delete `node_modules` and `package-lock.json` and run `npm install` to regenerate it, then commit the new lock file."
keywords: npm err code eintegrity integrity checksum failed when using sha512 wanted but got sha1 package-lock.json npm cache clean --force registry mirror
related: [npm-err-code-enotempty, npm-err-code-etimedout, npm-eresolve-unable-to-resolve-dependency-tree]
---
## What it means

Every package in `package-lock.json` has an `integrity` field — a Subresource Integrity hash (`sha512-...`, sometimes `sha1-...` in old lock files) of the exact tarball. When npm installs, it hashes what it got and compares. A mismatch means the bytes differ from what the lock file expects, and npm refuses to install them. This is a security feature, so don't bypass it blindly.

## Cause 1: corrupted npm cache

An interrupted download or disk problem leaves a bad entry in `~/.npm/_cacache`. Check and repair:

```bash
npm cache verify
npm install
```

If that doesn't help, wipe the cache:

```bash
npm cache clean --force
npm install
```

On Windows the cache is in `%LocalAppData%\npm-cache`.

## Cause 2: lock file made against a different registry

Private registries and mirrors (Artifactory, Nexus, Verdaccio, a regional mirror) sometimes repackage tarballs, producing different hashes from registry.npmjs.org. If a teammate generated the lock file on one registry and you install from another, every affected package fails.

Check where the lock file points versus your config:

```bash
npm config get registry
grep -m3 '"resolved"' package-lock.json
```

Use the same registry as the team (project `.npmrc`), or regenerate the lock file:

```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
```

Regenerating may update dependency versions within your semver ranges; run your tests afterwards.

## Cause 3: a single stale entry in the lock file

When only one package fails, you can refresh just that entry instead of the whole lock file:

```bash
npm install <package>@<version>
```

Or remove its `integrity` line (and the matching `resolved` line) in `package-lock.json` and run `npm install` — npm recomputes and writes it back.

## Cause 4: proxy or firewall altering downloads

TLS-inspecting proxies or antivirus software that rewrite or truncate responses cause hash mismatches, often with a byte count far smaller than expected (an HTML error page instead of a tarball). Try another network, or configure the proxy correctly (see [npm ETIMEDOUT](/npm/npm-err-code-etimedout/)). Look at the bytes number in the error — if it's tiny, you received an error page.

## Cause 5: the published package changed

Rarely, a package version was unpublished and republished, or a registry served a wrong file. If the hash in the lock file matches what `npm view <pkg>@<version> dist.integrity` returns, the problem is your download path; if it doesn't, the lock file is wrong — regenerate it.

You can compare a hash yourself with the [hash generator](/tools/hash-generator/) or:

```bash
npm pack <pkg>@<version>
openssl dgst -sha512 -binary <pkg>-<version>.tgz | openssl base64 -A
```

## CI

In CI, `npm ci` fails the same way. Cache `~/.npm` keyed on the hash of `package-lock.json` so a corrupted cache isn't restored forever; if it is, bump the cache key.
