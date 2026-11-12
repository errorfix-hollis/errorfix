---
error: "! [remote rejected] main -> main (pre-receive hook declined)"
error_full: |
  remote: error: ...
  To github.com:org/repo.git
   ! [remote rejected] main -> main (pre-receive hook declined)
  error: failed to push some refs to 'github.com:org/repo.git'
cat: git
description: "The server ran a pre-receive hook on your push and it exited non-zero, so nothing was accepted. The real reason is in the remote: lines above, e.g. a protected branch, a file size or secret scan, commit email/signature rules, or a server-side policy script."
tldr: "Scroll up and read the `remote:` lines; they say which rule failed. Common fixes: push to a feature branch and open a PR (protected branch), remove a large file or secret from history (`git rm --cached` + `git commit --amend` or `git filter-repo`), fix your commit email (`git config user.email` + `git commit --amend --reset-author`), or sign commits. Self-hosted: check the hook script in the repo's `hooks/` dir on the server."
keywords: git push remote rejected pre-receive hook declined failed to push some refs gitlab github bitbucket gitea protected branch push rule commit email secret detected large file gpg signature
related: [git-remote-rejected-protected-branch, git-gh001-large-files-detected, git-failed-to-push-some-refs]
---
## What it means

Before a Git server updates any branch, it runs a **pre-receive hook** with the list of refs you're pushing. If the hook exits non-zero, the whole push is rejected. Git itself only prints the generic `(pre-receive hook declined)`; the hook's explanation is in the `remote:` lines **above** it. Always read those first:

```bash
git push -v origin main 2>&1 | grep '^remote:'
```

GitHub, GitLab, Bitbucket, Gitea and Azure DevOps all implement their rules as pre-receive hooks, so the same message covers many policies.

## Cause 1: protected branch

```
remote: GitLab: You are not allowed to push code to protected branches on this project.
```

The branch only accepts merges via merge/pull requests, or your role can't push. Push a branch and open a PR:

```bash
git switch -c fix/login
git push -u origin fix/login
```

See [protected branch hook declined](/git/git-remote-rejected-protected-branch/) for force-push and role settings. On a brand-new GitLab project, the default branch is protected as soon as it exists, so an initial `git push --force` of a rewritten history is refused too.

## Cause 2: file too large or a blocked file type

```
remote: error: GH001: Large files detected.
remote: GitLab: File "data.zip" is larger than the allowed size of 100 MiB
```

Remove the file from **all** commits you're pushing, not just the latest; see [GH001 large files detected](/git/git-gh001-large-files-detected/). If only the last commit added it:

```bash
git rm --cached data.zip
echo data.zip >> .gitignore
git commit --amend --no-edit
git push
```

Use Git LFS for big binaries.

## Cause 3: secret detected (push protection)

```
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Push cannot contain secrets
```

GitHub push protection, GitLab secret push protection or a custom scanner found an API key/token. **Revoke the key first** (it may be leaked already), then remove it from the commits, e.g. edit the file and `git commit --amend`, or for older commits `git rebase -i` / `git filter-repo --replace-text`. Move secrets to environment variables.

## Cause 4: commit author / email rules

```
remote: GitLab: Author 'me@laptop.local' is not a member of team
remote: Commit must be signed
remote: error: GH007: Your push would publish a private email address.
```

Fix your identity and rewrite the unpushed commits:

```bash
git config user.email "you@company.com"
git commit --amend --reset-author --no-edit            # last commit
git rebase -r origin/main --exec "git commit --amend --reset-author --no-edit"   # all unpushed
```

For GH007, use your GitHub `ID+username@users.noreply.github.com` address or untick *Block command line pushes that expose my email*. For signature rules, configure signing (`git config commit.gpgsign true`, or `gpg.format ssh` with `user.signingkey`) and re-sign with the same rebase `--exec "git commit --amend --no-edit -S"`.

## Cause 5: commit message or branch name rules

GitLab push rules and Bitbucket hooks can require messages like `JIRA-123: ...` or branch names like `feature/*`. Reword with `git commit --amend` (or `git rebase -i` with `reword`), or rename the branch: `git branch -m feature/login`.

## Cause 6: self-hosted server scripts

On a bare repo you manage, the hook is `hooks/pre-receive` (or `custom_hooks/` / `pre-receive.d/` on GitLab). Check it's executable and test it:

```bash
ls -l /srv/git/repo.git/hooks/pre-receive
```

Disk full or permission problems on the server can also make hooks fail; check the server logs. GitHub Enterprise admins can view hook output under the repository's *Pre-receive hooks* settings.
