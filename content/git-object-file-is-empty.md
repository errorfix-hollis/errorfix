---
error: "error: object file .git/objects/xx/... is empty"
error_full: |
  error: object file .git/objects/3a/8f2c41e0b7d9a5c6e1f4b2d8a7c3e9f0b1d2a4 is empty
  error: object file .git/objects/3a/8f2c41e0b7d9a5c6e1f4b2d8a7c3e9f0b1d2a4 is empty
  fatal: loose object 3a8f2c41e0b7d9a5c6e1f4b2d8a7c3e9f0b1d2a4 (stored in .git/objects/3a/8f2c41...) is corrupt
cat: git
description: "A loose object file in .git/objects was truncated to zero bytes, usually by a crash, power loss, full disk or a sync tool (Dropbox, OneDrive) touching the repo. Git can't read that commit, tree or blob."
tldr: "Back up first (`cp -r .git ../git-backup`). Delete the empty object files: `find .git/objects -type f -empty -delete`, then `git fetch -p` to re-download missing objects from the remote and run `git fsck --full` to check. If only local commits are lost, recover them from `git reflog` or re-clone and copy your working files over."
keywords: git error object file is empty loose object is corrupt fatal bad object fsck objects empty power loss vm crash dropbox repair repository
related: [git-fatal-bad-object, git-index-lock-file-exists, git-cannot-lock-ref]
---
## What it means

Git stores each commit, tree and file version as a compressed *object* under `.git/objects/<2 chars>/<38 chars>`. Writing an object is normally atomic, but if the machine crashed, the disk filled up, or a VM/filesystem didn't flush in time, you can end up with a file that exists but has 0 bytes. Any command that needs it (`status`, `log`, `commit`, `pull`) fails with this error.

The good news: if you have a remote, almost everything is recoverable, because the remote has the same objects.

## Step 0: back up the repository

Repairs delete files. Copy first:

```bash
cp -a .git ../repo-git-backup
```

Also make sure the disk isn't full (`df -h .`). If it is, free space before anything else, or the repair will corrupt more objects.

## Fix 1: remove empty objects and re-fetch

```bash
find .git/objects -type f -empty -delete    # remove the 0-byte objects
git fetch -p                                # re-download objects the remote has
git fsck --full                             # list what is still broken
```

If `git fsck` reports only `dangling` objects, the repo is fine. If `git status` still fails with `bad object HEAD` or `missing tree`, continue below.

## Fix 2: repair a broken HEAD or branch ref

If the corrupted object was the commit your branch points to, the ref now points at nothing. Look at the reflog to find the previous good commit:

```bash
tail -n 5 .git/logs/HEAD          # works even when git commands fail
git reflog                        # if git itself still runs
```

Point the branch at a known good commit (either from the reflog or the remote):

```bash
git update-ref refs/heads/main origin/main      # or a hash from the reflog
git reset                                       # rebuild the index from HEAD, keeps working files
```

The empty index (`.git/index`) can also be the problem (`error: bad signature`, `index file corrupt`). Rebuild it:

```bash
rm .git/index
git reset
```

`git reset` without `--hard` keeps your working directory untouched.

## Fix 3: commits that were never pushed

Objects that only existed locally can't be fetched. Check what you'd lose:

```bash
git fsck --full 2>&1 | grep -E 'missing|broken'
```

If the missing objects are blobs of files you still have in your working tree, re-add them: `git hash-object -w path/to/file` recreates the blob if the content is identical. Missing commits or trees usually mean recreating those commits.

## Fix 4: re-clone (fastest when you have a remote)

When the repair gets messy, start fresh and keep your uncommitted work:

```bash
cd ..
git clone git@github.com:me/repo.git repo-fresh
rsync -a --exclude .git repo/ repo-fresh/     # copy your working files over
cd repo-fresh && git status                   # review and commit your changes
```

## Preventing it

- Don't keep repos in Dropbox/OneDrive/iCloud-synced folders; sync clients rewrite files mid-operation.
- On VMs and WSL, shut down cleanly rather than killing the VM.
- Push often, so the remote always holds a full copy of your objects.
