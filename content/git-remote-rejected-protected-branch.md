---
error: "! [remote rejected] main -> main (protected branch hook declined)"
error_full: |
  remote: GitLab: You are not allowed to push code to protected branches on this project.
  To gitlab.com:team/app.git
   ! [remote rejected] main -> main (pre-receive hook declined)
  error: failed to push some refs to 'gitlab.com:team/app.git'
  remote: error: GH006: Protected branch update failed for refs/heads/main.
   ! [remote rejected] main -> main (protected branch hook declined)
cat: git
description: "The server refused the push because the target branch is protected (no direct pushes, no force pushes, or required reviews/status checks). Push to a new branch and open a pull/merge request instead."
tldr: "Move your commits to a feature branch and open a PR: `git switch -c my-fix`, `git push -u origin my-fix`. Then reset local main: `git switch main && git reset --hard origin/main`. Only change the protection rules if you own the repo and really want direct pushes."
keywords: git push remote rejected protected branch hook declined pre-receive hook declined gh006 protected branch update failed gitlab not allowed to push code to protected branches force push main
related: [git-failed-to-push-some-refs, git-no-upstream-branch, git-permission-denied-publickey]
---
## What it means

Authentication worked (you reached the server), but a server-side hook rejected the ref update. On GitHub this is `GH006: Protected branch update failed`; on GitLab and Bitbucket it shows as `pre-receive hook declined`. Branch protection typically forbids one or more of:

- pushing directly (changes must arrive via pull/merge request),
- force-pushing or deleting the branch,
- commits without required status checks, reviews, signatures or linear history.

The rest of the remote output usually says which rule you hit. Read the lines starting with `remote:`.

## Fix 1: push to a branch and open a pull request

This is the intended workflow. Your local commits are safe; just move them:

```bash
git switch -c fix/login-timeout      # new branch at your current commit
git push -u origin fix/login-timeout
```

Open the PR/MR from the link Git prints. Then make local `main` match the server again so the next pull is clean:

```bash
git switch main
git fetch origin
git reset --hard origin/main         # discards local-only commits on main (they're on your branch now)
```

## Fix 2: you tried to force-push

Rewriting history (`git push --force` after rebase or amend) on a protected branch is blocked even for admins in many setups. Options:

- Don't rewrite: `git pull --rebase origin main` then a normal `git push`, or revert with `git revert <sha>` instead of resetting.
- On your own feature branch, force pushes are usually allowed. Use `git push --force-with-lease`.

## Fix 3: required signatures, checks or linear history

- **Signed commits required:** set up signing (`git config commit.gpgsign true`, or SSH signing with `git config gpg.format ssh` and `user.signingkey`), then re-sign: `git rebase --exec 'git commit --amend --no-edit -S' origin/main`.
- **Linear history:** no merge commits allowed. Rebase instead of merge: `git rebase origin/main`.
- **Status checks/reviews:** these only pass through a PR, so use Fix 1.

## Fix 4: GitLab "not allowed to push code to protected branches"

Your role (e.g. Developer) is below the "Allowed to push" level for that branch. Push a branch and open a merge request, or ask a Maintainer to change **Settings → Repository → Protected branches**. New empty GitLab projects protect the default branch on first push, so the initial push may need Maintainer rights.

## Fix 5: you own the repo and want to push directly

On GitHub: **Settings → Branches** (or **Rules → Rulesets**) and edit the rule for `main`: allow bypass for admins, disable "Require a pull request before merging", or allow force pushes. On GitLab: **Settings → Repository → Protected branches** and set "Allowed to push and merge". Prefer giving yourself bypass rights over removing protection completely.

## Other "remote rejected" reasons

- `(shallow update not allowed)`: you pushed from a shallow clone; run `git fetch --unshallow` first.
- `(refusing to delete the current branch)`: change the default branch on the server first.
- [GH001 large files detected](/git/git-gh001-large-files-detected/): a file over 100 MB is in your history.
