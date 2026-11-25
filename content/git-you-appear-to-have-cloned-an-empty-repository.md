---
error: "warning: You appear to have cloned an empty repository."
error_full: |
  Cloning into 'myproject'...
  warning: You appear to have cloned an empty repository.
cat: git
description: "The remote repository has no commits yet, so git created a local repo with nothing checked out. It's a warning, not a failure, unless you expected code to be there."
tldr: "If the repo is new, just add files and push: `git add . && git commit -m \"Initial commit\" && git push -u origin main`. If it should have code, you cloned the wrong URL, the code is on another branch/host, or the push never happened: check `git ls-remote <url>`."
keywords: git warning you appear to have cloned an empty repository clone empty repo first push initial commit ls-remote github gitlab bitbucket wrong url
related: [git-src-refspec-main-does-not-match-any, git-failed-to-push-some-refs, git-no-upstream-branch]
---
## What it means

`git clone` succeeded: it created the folder, set up `origin` and downloaded everything, but the remote has **no commits and no branches**. There's nothing to check out, so your working tree is empty.

Check what the remote really has:

```bash
git ls-remote https://github.com/me/myproject.git
```

No output = the repository is empty on the server.

## Case 1: it's a brand-new repo (expected)

You created the repo on GitHub/GitLab without a README. Start working directly in the clone:

```bash
cd myproject
echo "# myproject" > README.md
git add .
git commit -m "Initial commit"
git branch -M main          # name the branch main if your git defaults to master
git push -u origin main
```

If you skip the commit, the push fails with `error: src refspec main does not match any`.

Already have a local project in another folder? Don't copy files around; push it to the empty remote instead:

```bash
cd existing-project
git init                     # if not yet a repo
git add . && git commit -m "Initial commit"
git remote add origin https://github.com/me/myproject.git
git push -u origin main
```

## Case 2: wrong URL

Very common with forks, similarly named repos, or a repo created on one account and pushed to another. Compare the URL with the one shown on the repository page (*Code* button) and check:

```bash
git remote -v
```

Fix it in place, then fetch:

```bash
git remote set-url origin https://github.com/right-owner/myproject.git
git fetch origin
git checkout main
```

## Case 3: code exists but on a non-default branch

`ls-remote` shows refs, but only something like `refs/heads/dev`. Git couldn't check out because the remote `HEAD` points to a branch that doesn't exist. Check out the branch explicitly:

```bash
git fetch origin
git branch -r
git checkout -b dev origin/dev
```

Fix it for others by setting the default branch in the hosting settings (GitHub: *Settings → General → Default branch*).

## Case 4: the push never happened

A colleague (or CI) thinks they pushed but got an error, or pushed to a different remote. Ask them to run `git push -u origin main` and check its output; `git status` should then say `Your branch is up to date with 'origin/main'`.

## Case 5: access rights / mirrors

On self-hosted servers (Gitea, bare repos over SSH) you may have cloned an empty bare repo created with `git init --bare` on the wrong path. Verify the path on the server (`ls /srv/git/myproject.git/refs/heads`). With LFS-only or mirrored repos, make sure the mirror has synced.

## Can I ignore it?

Yes, for a new repo. Everything works normally after your first commit and push.
