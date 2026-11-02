---
error: "error: cannot lock ref"
error_full: |
  error: cannot lock ref 'refs/remotes/origin/feature/login': is at 3f2a1c9 but expected 8b7d4e2
  error: cannot lock ref 'refs/remotes/origin/feature': 'refs/remotes/origin/feature/login' exists; cannot create 'refs/remotes/origin/feature'
  error: cannot lock ref 'refs/heads/main': Unable to create '.git/refs/heads/main.lock': File exists.
   ! [new branch]      feature    -> origin/feature  (unable to update local ref)
cat: git
description: Git couldn't update a branch or remote-tracking ref. Typically stale remote-tracking branches conflict with new names (feature vs feature/login), a leftover .lock file exists, or the ref changed underneath (another git process, case-insensitive filesystem).
tldr: "Run `git remote prune origin` (or `git fetch --prune`), then fetch again. If it says `.lock: File exists`, make sure no git process is running and delete that lock file. For `is at X but expected Y`, run `git gc --prune=now` and `git update-ref -d refs/remotes/origin/BRANCH`, then `git fetch`."
keywords: git error cannot lock ref unable to update local ref is at but expected exists cannot create git remote prune origin fetch --prune lock file exists packed-refs case insensitive
related: [git-index-lock-file-exists, git-failed-to-push-some-refs, git-not-possible-to-fast-forward-aborting]
---
## What it means

Git updates a ref (a branch, tag or remote-tracking branch such as `origin/main`) by creating `<ref>.lock`, writing the new commit id to it and renaming it into place. "Cannot lock ref" means that step failed. The text after the colon tells you why — pick the matching fix.

## Fix 1: `'refs/remotes/origin/a/b' exists; cannot create 'refs/remotes/origin/a'`

Refs are stored as files, so `origin/feature` (a file) and `origin/feature/login` (a file inside a `feature/` directory) can't both exist. This happens when someone deleted `feature/login` on the remote and created `feature`, but your clone still has the old remote-tracking branch.

Remove stale remote-tracking branches:

```bash
git remote prune origin
git fetch
```

or in one go:

```bash
git fetch --prune
```

Make it the default:

```bash
git config --global fetch.prune true
```

If the conflicting ref is a *local* branch (`refs/heads/...`), rename or delete it yourself: `git branch -m feature/login feature-login`.

## Fix 2: `Unable to create '...lock': File exists`

Another git process is running (IDE, a background `git fetch`, a crashed command), or one died and left the lock behind.

```bash
ps aux | grep -i git
```

If nothing is running, delete the specific lock file from the message:

```bash
rm .git/refs/heads/main.lock
# or for remote refs
rm .git/refs/remotes/origin/feature.lock
```

A leftover `.git/packed-refs.lock` or `.git/HEAD.lock` can be removed the same way. Find all of them:

```bash
find .git -name "*.lock"
```

## Fix 3: `is at <sha> but expected <sha>`

The ref changed between Git reading and writing it — often a concurrent fetch, or a corrupted/duplicate entry between loose refs and `packed-refs`. Clean up and retry:

```bash
git gc --prune=now
git fetch
```

If one remote-tracking ref stays broken, delete it; the next fetch recreates it:

```bash
git update-ref -d refs/remotes/origin/feature/login
git fetch
```

## Fix 4: case-insensitive filesystems (macOS, Windows)

If the remote has both `Feature/x` and `feature/x`, they map to the same path on macOS/Windows and the fetch fails with a lock error. Ask the team to delete one of them on the remote. Locally, prune and pack refs so they're not stored as files:

```bash
git fetch --prune
git pack-refs --all
```

## Fix 5: push errors from the server

`remote: error: cannot lock ref 'refs/heads/x'` during `git push` comes from the *server*: someone pushed at the same time (retry), or the remote already has a branch whose name conflicts as in Fix 1 (`x` vs `x/y`). Choose a branch name that doesn't nest under or over an existing one.

## Fix 6: permissions

`Permission denied` while locking means `.git` contains files owned by another user, usually from running git with `sudo` once:

```bash
sudo chown -R "$(id -u):$(id -g)" .git
```
