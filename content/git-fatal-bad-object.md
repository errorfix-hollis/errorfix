---
error: "fatal: bad object"
error_full: |
  fatal: bad object 3f2a9c1d8e7b6a5f4e3d2c1b0a9f8e7d6c5b4a39
  fatal: bad object HEAD
  error: refs/remotes/origin/main does not point to a valid object!
cat: git
description: "Git was asked for an object (commit, tree or blob) that isn't in the local object database. Usually the commit just hasn't been fetched; sometimes a ref or object file is corrupted."
tldr: "If it's a commit from someone else or another branch, run `git fetch --all` (or `git fetch origin <sha>`) and retry. If it says `bad object HEAD` or refs point to invalid objects, run `git fsck --full`, delete the broken ref (e.g. `git update-ref -d refs/remotes/origin/main`) and fetch again; worst case, re-clone and copy your work over."
keywords: git fatal bad object HEAD sha cherry-pick bad object does not point to a valid object git fsck corrupt repository shallow clone fetch
related: [git-cannot-lock-ref, git-not-a-git-repository, git-rpc-failed-curl-92-early-eof]
---
## What it means

Every commit, tree and file in Git is an object identified by its hash, stored in `.git/objects` (loose or in packfiles). `bad object <name>` means Git looked up that name and the object isn't there, or is unreadable.

Two very different situations produce it.

## Cause 1: the commit hasn't been fetched yet (most common)

You copied a SHA from GitHub, a colleague or CI and ran:

```bash
git cherry-pick 3f2a9c1d
git show 3f2a9c1d
git diff 3f2a9c1d
```

Your clone simply doesn't have that commit. Fetch it:

```bash
git fetch --all --prune
git fetch origin 3f2a9c1d8e7b6a5f4e3d2c1b0a9f8e7d6c5b4a39   # a single commit (GitHub/GitLab allow this)
```

For a commit from a pull request or a fork:

```bash
git fetch origin pull/123/head          # GitHub PR
git fetch https://github.com/other/repo.git branch-name
```

## Cause 2: shallow or partial clone

CI systems often clone with `--depth=1`, so older commits aren't present (`git merge-base`, `git describe` and diffs against older SHAs fail):

```bash
git rev-parse --is-shallow-repository   # true?
git fetch --unshallow
```

In GitHub Actions use `actions/checkout` with `fetch-depth: 0`.

## Cause 3: `bad object HEAD` / corrupted repository

This one is real corruption: the ref or object files are damaged. Typical triggers are a crash or power loss during a commit, a full disk, or keeping the repo in Dropbox/OneDrive/iCloud, which can sync half-written files.

**Back up first:** `cp -r myrepo myrepo-backup`.

Then diagnose:

```bash
git fsck --full
```

### Broken ref

If fsck or `git fetch` reports `refs/... does not point to a valid object`, delete the ref and re-fetch it:

```bash
git update-ref -d refs/remotes/origin/main
git fetch origin
```

For a broken local branch, check the reflog for the last good commit:

```bash
cat .git/HEAD
git reflog show main | head          # or: tail .git/logs/refs/heads/main
git update-ref refs/heads/main <good-sha>
```

### Empty or corrupt object files

`error: object file .git/objects/ab/cdef... is empty` — remove the empty files and restore them from the remote:

```bash
find .git/objects -type f -empty -delete
git fetch -p
git fsck --full
```

Objects that were already pushed come back with fetch. Objects that existed only locally (unpushed commits) may be lost; check `git fsck --lost-found` for dangling commits you can recover.

## Cause 4: re-clone as the reliable last resort

If fsck keeps reporting missing objects:

```bash
git clone https://github.com/you/repo.git repo-fresh
# copy uncommitted work files from the old working tree (not .git)
```

Then move the repo out of any cloud-synced folder to avoid a repeat.

## Related messages

- `fatal: bad revision 'xyz'` — the name doesn't resolve at all (typo, or branch not fetched).
- `fatal: ambiguous argument 'xyz': unknown revision or path` — same idea; use `git branch -a` to check names.
- `fatal: bad object refs/stash` — a broken stash ref: `git update-ref -d refs/stash` (you lose that stash).
