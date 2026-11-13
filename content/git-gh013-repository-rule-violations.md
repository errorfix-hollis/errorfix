---
error: "remote: error: GH013: Repository rule violations found for refs/heads/main."
error_full: |
  remote: error: GH013: Repository rule violations found for refs/heads/main.
  remote:
  remote: - GITHUB PUSH PROTECTION
  remote:   —————————————————————————————————————————
  remote:     Resolve the following violations before pushing again
  remote:
  remote:     - Push cannot contain secrets
  remote:
  remote:      —— GitHub Personal Access Token ——————————————————————
  remote:        locations:
  remote:          - commit: 8f3c2a1...
  remote:            path: config/settings.py:12
  remote:
  To https://github.com/user/repo.git
   ! [remote rejected] main -> main (push declined due to repository rule violations)
  error: failed to push some refs to 'https://github.com/user/repo.git'
cat: git
description: "GitHub rejected the push because it breaks a repository ruleset: most often push protection found a secret (API key, token) in one of the commits, or a branch rule requires pull requests, signed commits or linear history."
tldr: "Read the rule listed under GH013. For secrets: revoke the key, remove it from the code, then rewrite the commit(s) that contain it (`git commit --amend` for the last one, `git rebase -i` for older ones) and push again. For branch rules (PR required, signed commits): push to a new branch and open a pull request, or ask an admin to change the ruleset."
keywords: github gh013 repository rule violations found push protection push cannot contain secrets push declined due to repository rule violations ruleset secret scanning remove secret from commit history
related: [git-remote-rejected-protected-branch, git-pre-receive-hook-declined, git-failed-to-push-some-refs]
---
## What it means

GitHub evaluates *rulesets* and *push protection* on every push. If any commit in the push violates a rule, the whole push is rejected with `GH013`. The lines after `remote:` tell you which rule. Removing the file in a new commit is **not enough** — the secret is still in the earlier commit, and every commit in the push is scanned.

## Cause 1: "Push cannot contain secrets" (push protection)

GitHub detected a token, API key or private key in your commits. The output lists the secret type, commit and file path.

**First, treat the secret as leaked**: revoke/rotate it at the provider (GitHub, AWS, Stripe, OpenAI...). Then move it out of the code, e.g. into an environment variable or an untracked `.env` file listed in `.gitignore`.

**If the secret is in the latest commit:**

```bash
# edit the file to remove the secret
git rm --cached .env 2>/dev/null; echo ".env" >> .gitignore
git add -A
git commit --amend --no-edit
git push
```

**If it's in an older, unpushed commit:** find it and edit that commit with an interactive rebase:

```bash
git log --oneline origin/main..HEAD      # unpushed commits
git rebase -i <commit-before-the-secret>
# change "pick" to "edit" on the commit with the secret, save
# remove the secret from the file
git add -A
git commit --amend --no-edit
git rebase --continue
git push
```

**If the secret is spread through history** (or in many files), use `git filter-repo`:

```bash
pip install git-filter-repo
echo 'ghp_YourLeakedToken==>REMOVED' > replacements.txt
git filter-repo --replace-text replacements.txt
```

filter-repo removes the `origin` remote as a safety measure; add it back with `git remote add origin <url>` and push.

**False positive or test credential?** The error output includes a URL to allow that specific secret. Only use it for values that are genuinely not sensitive. Admins can configure push protection in *Settings → Code security*.

## Cause 2: changes must be made through a pull request

The ruleset on `main` requires PRs, so direct pushes are blocked:

```text
- Changes must be made through a pull request.
```

Push a branch and open a PR:

```bash
git switch -c fix/my-change
git push -u origin fix/my-change
```

Then reset your local `main` to match the remote: `git switch main && git reset --hard origin/main` (your commits are safe on the new branch).

## Cause 3: commits must have verified signatures

```text
- Commits must have verified signatures.
```

Set up commit signing (SSH or GPG), add the key to GitHub as a *Signing key*, then re-sign the commits:

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
git rebase --exec "git commit --amend --no-edit -S" origin/main
git push
```

## Cause 4: other ruleset rules

- *This branch must not contain merge commits* → `git rebase origin/main` instead of merging, then push.
- *Cannot force-push to this branch* / *Cannot delete this branch* → don't force-push to protected branches; use a new branch.
- *Commit message / author email must match a pattern* → amend messages or author (`git commit --amend --reset-author`).
- *File path restrictions / file size* → remove the file from the commits as in Cause 1.

Repository admins can see and change rules under *Settings → Rules → Rulesets*.
