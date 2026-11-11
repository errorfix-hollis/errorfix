---
error: "! [rejected] v1.0 -> v1.0 (would clobber existing tag)"
error_full: |
  From github.com:me/repo
   ! [rejected]        v1.0       -> v1.0  (would clobber existing tag)
   ! [rejected]        latest     -> latest  (would clobber existing tag)
cat: git
description: "A tag on the remote points to a different commit than your local tag with the same name, and Git (2.20+) refuses to overwrite local tags on fetch/pull. Someone moved or re-created the tag after you fetched it."
tldr: "Accept the remote's version of the tags: `git fetch --tags --force` (or `git pull --tags -f`). To update one tag: `git tag -d v1.0 && git fetch origin tag v1.0`. If your local tag is the correct one, push it with `git push --force origin v1.0` instead."
keywords: git rejected would clobber existing tag fetch pull tags force moved tag retag latest git fetch --tags --force
related: [git-updates-were-rejected-because-the-tag-already-exists, git-cannot-lock-ref, git-failed-to-push-some-refs]
---
## What it means

Tags are supposed to be immutable. Since Git 2.20, `git fetch` and `git pull` no longer silently update a local tag when the remote tag with the same name points to a different commit. Instead they print `would clobber existing tag` and leave your local tag alone. The rest of the fetch still succeeds, but `git pull` may report an error exit code, which breaks scripts and CI.

It happens when someone:

- deleted and re-created a release tag on another commit (`v1.0` re-tagged after a hotfix),
- uses a moving tag like `latest`, `stable`, `nightly` or a GitHub Action major tag (`v4`) that is updated on every release.

Compare both sides:

```bash
git rev-parse v1.0^{commit}                  # your local tag
git ls-remote --tags origin v1.0             # the remote's tag (and v1.0^{} for annotated)
```

## Fix 1: take the remote's tags

If the remote is authoritative (usually the case), force-update local tags:

```bash
git fetch --tags --force
```

Or as part of a pull:

```bash
git pull --tags --force
```

`--force` here only affects refs being fetched; it doesn't touch your branches or working tree.

## Fix 2: update a single tag

```bash
git tag -d v1.0
git fetch origin tag v1.0
```

This is the safest option when only one tag moved and you want to keep others unchanged.

## Fix 3: your local tag is the right one

If you intentionally moved the tag and the remote has the old commit, push it with force (this rewrites the tag for everyone else, who will then see this same error):

```bash
git tag -f v1.0 <commit>
git push --force origin v1.0
```

Pushing a moved tag without `--force` fails with `Updates were rejected because the tag already exists in the remote`. Many hosts protect release tags; you may need to lift the protection first.

## Fix 4: CI and scripts

In CI the error usually comes from a cached checkout plus a moved tag. Options:

```bash
git fetch --tags --force --prune --prune-tags
```

`--prune-tags` also deletes local tags that no longer exist on the remote. In GitHub Actions, `actions/checkout` with `fetch-tags: true` performs a fresh fetch; for self-hosted runners with persistent workspaces, add the command above before using tags.

To make fetches always overwrite tags from a specific remote, set a forced refspec:

```bash
git config --add remote.origin.fetch "+refs/tags/*:refs/tags/*"
```

The leading `+` means force for those refs.

## Avoiding it

Don't move release tags; create a new version (`v1.0.1`) instead. For "latest"-style pointers, a branch is often a better fit than a tag, because moving branches is normal and doesn't trigger this protection.
