---
error: "npm ERR! code E404 - Not Found"
error_full: |
  npm ERR! code E404
  npm ERR! 404 Not Found - GET https://registry.npmjs.org/my-pakage - Not found
  npm ERR! 404  'my-pakage@*' is not in this registry.
cat: npm
description: npm couldn't find the package (or version) in the registry it asked. Typo in the name, a private/scoped package without auth, a wrong registry in .npmrc, or a version that was never published.
tldr: "Check the exact name on npmjs.com (`npm view <name>`). For scoped/private packages (`@company/pkg`) log in or set the token in `.npmrc`. Check `npm config get registry` points where you expect."
keywords: npm err code e404 not found is not in this registry scoped package private registry npmrc auth token github packages typo
related: [npm-eresolve-unable-to-resolve-dependency-tree, npm-enoent-package-json]
---
## What it means

npm sent `GET <registry>/<package>` and got 404. The registry answers 404 both for "doesn't exist" and "exists but you're not allowed to see it" (private packages).

## Cause 1: typo or wrong package name

```bash
npm view my-pakage          # 404
npm search my-package
```

Many packages have unexpected names: `@types/node`, `node-fetch`, `bcryptjs` vs `bcrypt`. Copy the name from the package's npm page.

## Cause 2: the version doesn't exist

`404 'lodash@9.0.0' is not in this registry` means the package exists but not that version. List versions:

```bash
npm view lodash versions --json
```

Fix the version in `package.json`, or delete `package-lock.json` if it pins a version that was unpublished.

## Cause 3: private or scoped package without auth

For `@company/pkg` hosted on npm privately:

```bash
npm login
npm whoami
```

For GitHub Packages, GitLab, Artifactory etc., the scope must point at that registry with a token in `.npmrc`:

```ini
@company:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

In CI, make sure `NPM_TOKEN` is set as a secret.

## Cause 4: wrong registry configured

```bash
npm config get registry
```

Should normally be `https://registry.npmjs.org/`. A leftover corporate mirror or `.npmrc` in the project/home folder can send all requests elsewhere:

```bash
npm config set registry https://registry.npmjs.org/
```

## Cause 5: `npm ERR! 404` on `npm publish`

Publishing a scoped package you don't own, or to an organization you're not a member of, returns 404. Check the `name` in `package.json`, and for a public scoped package use `npm publish --access public`.
