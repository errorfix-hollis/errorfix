---
error: "remote: error: GH001: Large files detected. You may want to try Git Large File Storage"
error_full: |
  remote: error: Trace: 8f3c2d...
  remote: error: See https://gh.io/lfs for more information.
  remote: error: File data/model.bin is 312.45 MB; this exceeds GitHub's file size limit of 100.00 MB
  remote: error: GH001: Large files detected. You may want to try Git Large File Storage - https://git-lfs.github.com.
  To github.com:me/repo.git
   ! [remote rejected] main -> main (pre-receive hook declined)
  error: failed to push some refs to 'github.com:me/repo.git'
cat: git
description: GitHub rejects pushes containing any file over 100 MB, in any commit being pushed. Deleting the file in a new commit is not enough; it has to be removed from history (or moved to Git LFS).
tldr: "If the big file is only in your last commit: `git rm --cached path/to/file`, add it to `.gitignore`, `git commit --amend`, push. If it's in older unpushed commits, `git reset --soft origin/main` and recommit without it, or rewrite with `git filter-repo --path path/to/file --invert-paths`. To keep it versioned, use `git lfs migrate import --include=\"*.bin\"`."
keywords: github gh001 large files detected exceeds github's file size limit of 100 mb git lfs pre-receive hook declined remove large file from history filter-repo
related: [git-failed-to-push-some-refs, git-src-refspec-main-does-not-match-any]
---
## What it means

GitHub blocks any single file larger than 100 MB (and warns above 50 MB). The check runs on **every commit in the push**, not just the latest tree. So if you committed a 300 MB file, then deleted it in a later commit, the push still fails: the blob is still in history.

First find what's too big (the error names it), and which commits haven't been pushed:

```bash
git log origin/main..HEAD --stat     # unpushed commits and the files they touch
```

## Fix 1: the file is only in the last commit

```bash
git rm --cached data/model.bin        # untrack, keep the file on disk
echo "data/model.bin" >> .gitignore
git add .gitignore
git commit --amend --no-edit
git push
```

## Fix 2: it's in several unpushed commits

The simplest way is to squash your unpushed work into a fresh commit without the file:

```bash
git reset --soft origin/main          # keep all changes staged, drop the commits
git rm --cached data/model.bin
echo "data/model.bin" >> .gitignore
git add .gitignore
git commit -m "Add feature (without large data file)"
git push
```

This loses the individual commit messages. To keep them, use an interactive rebase (`git rebase -i origin/main`), mark the commit that added the file as `edit`, run `git rm --cached` + `git commit --amend`, then `git rebase --continue`.

## Fix 3: rewrite history with git filter-repo

For a file buried deep in history (or a branch never pushed before), `git filter-repo` removes it from every commit. Install it (`pip install git-filter-repo` or `sudo apt install git-filter-repo`), work on a fresh clone or backup, then:

```bash
git filter-repo --path data/model.bin --invert-paths
# or everything above a size
git filter-repo --strip-blobs-bigger-than 100M
```

filter-repo removes the `origin` remote as a safety measure. Re-add it and push:

```bash
git remote add origin git@github.com:me/repo.git
git push -u origin main --force
```

Force-pushing rewritten history affects anyone else who has cloned the repo; they'll need to re-clone or reset.

## Fix 4: keep the file, using Git LFS

If the file belongs in the repo, store it in LFS (GitHub's free LFS quota is limited, check your plan):

```bash
git lfs install
git lfs migrate import --include="*.bin" --include-ref=refs/heads/main
git push
```

`migrate import` rewrites the existing commits so the files become LFS pointers. For new files only, `git lfs track "*.bin"` and commit `.gitattributes` before adding them.

## Prevent it

- Add data, models, build output, `node_modules`, `.venv` and archives to `.gitignore` before the first commit.
- Check for big files before committing: `find . -size +50M -not -path "./.git/*"`.
- Large datasets belong in object storage, releases (assets up to 2 GB), or a tool like DVC.
