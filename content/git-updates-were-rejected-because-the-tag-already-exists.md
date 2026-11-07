---
error: "Updates were rejected because the tag already exists in the remote"
error_full: |
  To github.com:me/app.git
   ! [rejected]        v1.2.0 -> v1.2.0 (already exists)
  error: failed to push some refs to 'github.com:me/app.git'
  hint: Updates were rejected because the tag already exists in the remote.
cat: git
description: "You pushed a tag whose name already exists on the remote but points to a different commit. Git refuses to move tags on push unless forced, because others may already have fetched the old tag."
tldr: "If the remote tag is correct, release under a new name (`git tag v1.2.1 && git push origin v1.2.1`). To move it deliberately: `git tag -f v1.2.0 <commit>` then `git push origin v1.2.0 --force` (or delete with `git push origin :refs/tags/v1.2.0` and push again). If your local tag is stale, `git fetch --tags --force`."
keywords: git push tag rejected already exists updates were rejected because the tag already exists in the remote force push tag move tag delete remote tag fetch tags would clobber existing tag
related: [git-failed-to-push-some-refs, git-cannot-lock-ref, git-src-refspec-main-does-not-match-any]
---
## What it means

Branches are expected to move; tags are not. When you push a tag that exists on the remote with a different target commit, Git rejects it with `(already exists)`. You hit this after re-creating a tag locally (`git tag -f`, or delete + recreate), or when two people tagged the same version.

The reverse problem on fetch looks like `! [rejected] v1.2.0 -> v1.2.0 (would clobber existing tag)`: the remote tag moved and your local copy is different.

Compare both sides:

```bash
git rev-parse v1.2.0^{commit}            # local target
git ls-remote --tags origin v1.2.0       # remote target (lines ending ^{} are the commit for annotated tags)
```

## Fix 1: use a new version number (safest)

If the tag was already published (a release, a package registry, CI deployed it), don't rewrite it. Tag the new commit with the next version:

```bash
git tag -a v1.2.1 -m "v1.2.1"
git push origin v1.2.1
```

Package registries (npm, PyPI, crates.io, Go module proxy) cache versions permanently; moving a Git tag won't change what users download. The Go proxy in particular keeps the original commit for a tag forever.

## Fix 2: move the tag on purpose

If nobody depends on it yet (e.g. you tagged the wrong commit a minute ago):

```bash
git tag -f v1.2.0 <correct-commit>       # add -a -m "..." for an annotated tag
git push origin v1.2.0 --force
```

Or delete the remote tag and push again:

```bash
git push origin --delete v1.2.0           # same as: git push origin :refs/tags/v1.2.0
git push origin v1.2.0
```

On GitHub, a tag attached to a published Release may be protected by a tag ruleset; deleting it then fails with `GH013` — change the rule or create a new tag. Deleting the tag also turns the GitHub Release into a draft.

Everyone else who fetched the old tag must update:

```bash
git fetch origin --tags --force
```

## Fix 3: your local tag is the stale one

If `git push --tags` fails because your local tags differ from the remote (you never meant to change them), sync from the remote instead:

```bash
git fetch origin --tags --force          # overwrite local tags with remote ones
git push origin --tags
```

To drop a single local tag: `git tag -d v1.2.0 && git fetch origin tag v1.2.0`.

## Fix 4: avoid `git push --tags` in scripts

`--tags` pushes every local tag, including old or experimental ones, so one mismatched tag breaks the whole push. Push the specific tag (`git push origin v1.2.0`) or use `git push --follow-tags`, which only pushes annotated tags reachable from the commits being pushed.

In CI, a job that re-runs on the same commit and tries to create the same tag will hit this every time. Make the step idempotent:

```bash
git ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null || {
  git tag "$TAG" && git push origin "$TAG"
}
```

## Name clash between a branch and a tag

If a branch and a tag share a name, plain `git push origin v1.2.0` can be ambiguous. Spell out the ref: `git push origin refs/tags/v1.2.0`.
