---
error: "! [remote rejected] main -> main (shallow update not allowed)"
error_full: |
  To github.com:me/new-repo.git
   ! [remote rejected] main -> main (shallow update not allowed)
  error: failed to push some refs to 'github.com:me/new-repo.git'
cat: git
description: "You're pushing from a shallow clone (made with `--depth`, e.g. by CI or `git clone --depth 1`) to a remote that doesn't have the missing older history. The remote can't accept a history with a cut-off root."
tldr: "Fetch the full history, then push again: `git fetch --unshallow origin` (check with `git rev-parse --is-shallow-repository`). If the original remote is gone, start a fresh history instead: `git checkout --orphan new-main && git commit -m \"Initial import\"` and push that. In GitHub Actions use `actions/checkout` with `fetch-depth: 0`."
keywords: git shallow update not allowed remote rejected push shallow clone depth 1 unshallow fetch-depth 0 github actions mirror new remote grafted is-shallow-repository
related: [git-failed-to-push-some-refs, git-refusing-to-merge-unrelated-histories, git-rpc-failed-curl-92-early-eof]
---
## What it means

A shallow clone (`git clone --depth 1`) has only the latest commits; the oldest one is "grafted", with its parents missing. Pushing that to a remote that already has the full history is fine. Pushing it to a *new or different* remote is not: the remote would receive commits whose parents it doesn't have, and by default it refuses (`receive.shallowUpdate` is false).

Check whether your repo is shallow:

```bash
git rev-parse --is-shallow-repository    # true / false
cat .git/shallow                         # grafted commit IDs, if shallow
git log --oneline | tail -3              # history stops early
```

## Fix 1: fetch the full history, then push

If the original remote (where you cloned from) is still reachable:

```bash
git fetch --unshallow origin
git push new-remote main
```

To mirror *all* branches and tags to the new remote:

```bash
git fetch --unshallow origin
git fetch origin '+refs/heads/*:refs/remotes/origin/*'
git push new-remote --all
git push new-remote --tags
```

A single-branch shallow clone only tracks one branch; the second fetch line widens it. Alternatively, start over with a full mirror clone:

```bash
git clone --mirror https://github.com/old/repo.git
cd repo.git
git push --mirror https://github.com/me/new-repo.git
```

## Fix 2: the original history isn't available

If you can't unshallow (template download, deleted upstream, you only have the snapshot), create a new root commit from the current files:

```bash
git checkout --orphan fresh
git add -A
git commit -m "Initial import"
git branch -D main
git branch -m main
git push -u new-remote main
```

The old history is dropped; the remote gets a clean single-commit history.

## Fix 3: CI pipelines

Most CI systems clone shallow by default. If a job pushes to another remote (mirroring to GitLab, deploying to Heroku/Dokku via git push), fetch full history.

GitHub Actions:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

GitLab CI:

```yaml
variables:
  GIT_DEPTH: 0
```

Shallow clones also break tools that need history, e.g. `git describe` (version from tags), changelog generators, and SonarQube blame. `fetch-depth: 0` fixes those too.

## Fix 4: allow shallow pushes on your own server

On a self-hosted bare repo you control, you can accept shallow pushes:

```bash
git -C /srv/git/repo.git config receive.shallowUpdate true
```

The server's repo then becomes shallow too, which is rarely what you want. Prefer Fix 1.

## Related: pulling into a shallow clone

`fatal: refusing to merge unrelated histories` after pulling in a shallow clone happens when the merge base is older than your depth. Deepen with `git fetch --deepen=100` or `git fetch --unshallow`, then merge again.
