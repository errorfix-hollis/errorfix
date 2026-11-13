---
error: "npm WARN deprecated <package>@<version>: <message>"
error_full: |
  npm WARN deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
  npm WARN deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
  npm WARN deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
cat: npm
description: "A warning, not an error: the package author marked that version as deprecated on the registry. Your install still succeeded. Most of these come from transitive dependencies you don't control directly."
tldr: "Run `npm ls <package>` to see which dependency pulls it in. If it's a direct dependency, upgrade or replace it (`npm install <pkg>@latest`). If it's transitive, update the parent (`npm update`, `npm outdated`), or force a newer version with `overrides` in package.json. Otherwise it's safe to ignore; the install did not fail."
keywords: npm warn deprecated inflight glob rimraf request uuid deprecated package warning npm ls why transitive dependency overrides npm update outdated safe to ignore
related: [npm-eresolve-unable-to-resolve-dependency-tree, npm-elifecycle, npm-err-code-e404]
---
## What it means

Package maintainers can run `npm deprecate pkg@version "message"`. From then on, every install of that version prints `npm WARN deprecated` with their message. It's **informational**: npm installed the package anyway, and your build is not broken.

If your install actually failed, the real error is further down, usually starting with `npm ERR!` / `npm error` (e.g. [ERESOLVE](/npm/npm-eresolve-unable-to-resolve-dependency-tree/) or [ELIFECYCLE](/npm/npm-elifecycle/)). Scroll past the warnings.

Deprecation reasons vary: unmaintained, security issues, renamed package, or "use a newer major version".

## Step 1: find out who depends on it

```bash
npm ls inflight
npm explain glob      # same as npm why
```

Example output:

```text
my-app@1.0.0
└─┬ jest@29.7.0
  └─┬ @jest/core@29.7.0
    └─┬ glob@7.2.3
      └── inflight@1.0.6
```

The top-level entry under your app is what you can act on.

## Fix 1: it's your direct dependency — upgrade or replace

```bash
npm outdated
npm install request@latest      # if a maintained version exists
```

Common replacements:

| Deprecated | Use instead |
|---|---|
| `request`, `request-promise` | built-in `fetch` (Node 18+), `undici`, `axios`, `got` |
| `uuid` < 7 (`require('uuid/v4')`) | `uuid` latest, or `crypto.randomUUID()` |
| `node-sass` | `sass` (Dart Sass) |
| `querystring` | `URLSearchParams` |
| `core-js@2` | `core-js@3` |
| `@babel/plugin-proposal-*` | `@babel/plugin-transform-*` (or drop, now in preset-env) |

## Fix 2: it's transitive — update the parent

```bash
npm update                 # within your semver ranges
npm install jest@latest    # new major of the parent, may need code changes
```

Many warnings (`inflight`, `glob@7`, `rimraf@3`) disappear once the tools that use them release new majors.

## Fix 3: force a newer version with overrides

If the parent works fine with a newer version of the deprecated dep, override it in `package.json` (npm 8.3+):

```json
{
  "overrides": {
    "glob": "^10.4.0",
    "rimraf": "^5.0.0"
  }
}
```

Then reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

Test your app afterwards: a new major can break the parent package. Yarn uses `resolutions`, pnpm uses `pnpm.overrides`.

## Fix 4: check security, not just deprecation

Deprecation isn't the same as a vulnerability. To see actual known vulnerabilities:

```bash
npm audit
```

## Can I hide the warnings?

```bash
npm install --loglevel=error
```

This hides all warnings, including useful ones. In CI it's fine for clean logs; locally, prefer fixing the source. Ignoring a deprecation of a dev-only tool (like `inflight` under Jest) is a reasonable choice when no upgrade exists yet.
