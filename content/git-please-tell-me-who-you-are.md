---
error: "Author identity unknown *** Please tell me who you are."
error_full: |
  Author identity unknown

  *** Please tell me who you are.

  Run

    git config --global user.email "you@example.com"
    git config --global user.name "Your Name"

  to set your account's default identity.
  Omit --global to set the identity only in this repository.

  fatal: unable to auto-detect email address (got 'me@laptop.(none)')
cat: git
description: "Git needs a name and email to record as the author of every commit, and none is configured for this user or repository."
tldr: "Run `git config --global user.name \"Your Name\"` and `git config --global user.email \"you@example.com\"`, then commit again. Use the email registered with GitHub/GitLab (or your noreply address) so commits link to your account. Omit `--global` to set it for one repo only."
keywords: git author identity unknown please tell me who you are unable to auto-detect email address git config user.email user.name global commit ci docker
related: [git-dubious-ownership, git-failed-to-push-some-refs, git-not-a-git-repository]
---
## What it means

Each commit stores an author and committer name and email. Git looks for `user.name` and `user.email` in repo config, then `~/.gitconfig`, then environment variables. If it can't find them and can't guess a valid email from your hostname, it refuses to commit.

Nothing is broken; you just haven't told Git who you are yet. This happens on a new machine, a fresh container, CI runner, or after running Git as another user (e.g. with `sudo`).

## Fix 1: set your identity globally

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Verify:

```bash
git config --global --list | grep user
```

Then re-run `git commit`.

On GitHub, use the email on your account so commits show your avatar. To keep your email private, use your noreply address from *Settings → Emails* (looks like `12345678+username@users.noreply.github.com`). If GitHub rejects the push with "push declines due to email privacy restrictions", switch to that noreply address and amend:

```bash
git commit --amend --reset-author --no-edit
```

## Fix 2: per-repository identity

For a work repo with a different email, run inside the repo without `--global`:

```bash
git config user.name "Your Name"
git config user.email "you@company.com"
```

Or switch automatically by folder in `~/.gitconfig`:

```ini
[includeIf "gitdir:~/work/"]
    path = ~/.gitconfig-work
```

## Fix 3: you set it, but for a different user

Config is per user. If you configured it as yourself but run `sudo git commit`, root has no identity. Don't use `sudo` for Git; fix ownership instead:

```bash
sudo chown -R "$USER" .
```

Check where a value comes from:

```bash
git config --show-origin --get user.email
```

## Fix 4: CI pipelines and Docker containers

Runners start with an empty config. Set it in the job:

```bash
git config --global user.name "ci-bot"
git config --global user.email "ci-bot@example.com"
```

GitHub Actions often uses the Actions bot identity:

```yaml
- run: |
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
```

Or set environment variables, which override config for a single command:

```bash
GIT_AUTHOR_NAME=bot GIT_AUTHOR_EMAIL=bot@example.com \
GIT_COMMITTER_NAME=bot GIT_COMMITTER_EMAIL=bot@example.com \
git commit -m "Automated update"
```

## Fix 5: wrong identity on commits you already made

```bash
git commit --amend --reset-author --no-edit          # last commit
git rebase -r <base> --exec "git commit --amend --no-edit --reset-author"   # several
```

Rewriting pushed commits requires a force push (`git push --force-with-lease`).
