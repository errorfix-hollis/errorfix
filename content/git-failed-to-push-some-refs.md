---
error: "error: failed to push some refs to"
error_full: |
  ! [rejected]        main -> main (fetch first)
  error: failed to push some refs to 'github.com:user/repo.git'
  hint: Updates were rejected because the remote contains work that you do
  hint: not have locally.
cat: git
description: The remote branch has commits you don't have. Pull (or rebase) first, then push again. Don't force-push unless you mean to overwrite others' work.
tldr: "Run `git pull --rebase origin main`, fix any conflicts, then `git push origin main`."
keywords: git push rejected fetch first non-fast-forward updates were rejected remote contains work
related: [git-refusing-to-merge-unrelated-histories, git-src-refspec-main-does-not-match-any]
---
## What it means

Your push would **overwrite commits on the remote** that aren't in your local branch, so Git rejects it. This is called a non-fast-forward push.

## Fix: integrate the remote changes first

```bash
git pull --rebase origin main
# if there are conflicts: edit files, then
git add <file>
git rebase --continue
git push origin main
```

Prefer a merge commit instead of a rebase? Use `git pull origin main` (without `--rebase`).

## Other versions of this error

| Message after `failed to push some refs` | Cause | Fix |
|---|---|---|
| `src refspec main does not match any` | The branch doesn't exist locally, usually because there are no commits yet | Make a commit first, or check the branch name with `git branch` |
| `(non-fast-forward)` | Same as above: remote is ahead | `git pull --rebase` then push |
| `pre-receive hook declined` | Server-side rule (protected branch, file too large, failed check) | Push to a new branch and open a pull request, or read the message above the error |
| `refusing to allow ... without workflow scope` | Personal access token lacks the `workflow` scope and you changed `.github/workflows` | Create a token with the `workflow` scope |

## When force-pushing is OK

Only if you are sure the remote commits should be thrown away (for example, after rebasing your own feature branch):

```bash
git push --force-with-lease origin my-branch
```

`--force-with-lease` refuses to overwrite if someone else pushed in the meantime, which makes it safer than `--force`.
