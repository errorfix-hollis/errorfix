---
error: "fatal: refusing to merge unrelated histories"
cat: git
description: Git won't merge two branches that share no common commit. Fix it with --allow-unrelated-histories, or rebase your work onto the remote.
tldr: "Run `git pull origin main --allow-unrelated-histories`, resolve any conflicts, then commit."
keywords: git pull merge unrelated histories new repo readme github
---
## What it means

Git found that the two branches you are combining have **no commit in common**. They are two separate projects as far as Git is concerned, so since Git 2.9 it refuses to merge them unless you say that's what you want.

## Why it happens

- You ran `git init` locally, made commits, then added a remote that **already has commits** (often a README, LICENSE or `.gitignore` created on GitHub/GitLab when you made the repository).
- You re-created the `.git` folder, so your local history no longer matches the remote.
- You are combining two different repositories on purpose.

## Fix 1: allow the merge (most common)

```bash
git pull origin main --allow-unrelated-histories
# resolve conflicts if any (often README.md), then:
git add .
git commit -m "Merge remote history"
git push origin main
```

Replace `main` with your branch name (`master` on older repos).

## Fix 2: rebase your commits on top of the remote

This keeps a straight history without a merge commit:

```bash
git fetch origin
git rebase origin/main
git push origin main
```

If Git still complains, `git rebase --root --onto origin/main` replays every local commit, including the first one, on top of the remote.

## Fix 3: the remote content doesn't matter

If the remote only has a generated README you don't need, overwrite it. **This deletes the remote commits**:

```bash
git push --force origin main
```

## How to avoid it

When creating a repository on GitHub for an existing local project, leave "Add a README", ".gitignore" and "license" **unchecked**, then push your local repository into the empty remote.
