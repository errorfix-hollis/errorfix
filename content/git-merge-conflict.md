---
error: "CONFLICT (content): Merge conflict in"
error_full: |
  Auto-merging src/app.js
  CONFLICT (content): Merge conflict in src/app.js
  Automatic merge failed; fix conflicts and then commit the result.
cat: git
description: Both branches changed the same lines. Edit the file to choose the right content, remove the conflict markers, then git add and commit.
tldr: "Open the file, pick the right code between `<<<<<<<`, `=======` and `>>>>>>>`, delete the markers, then `git add <file>` and `git commit` (or `git rebase --continue`). Changed your mind: `git merge --abort`."
keywords: merge conflict automatic merge failed fix conflicts conflict markers abort rebase continue ours theirs
related: [git-your-local-changes-would-be-overwritten, git-failed-to-push-some-refs]
---
## What it means

Git merged everything it could, but in at least one file **both sides changed the same lines** differently. It needs you to decide.

## See which files conflict

```bash
git status       # listed under "Unmerged paths"
```

## Resolve a file

Inside the file you'll see:

```text
<<<<<<< HEAD
const port = 3000;
=======
const port = process.env.PORT || 8080;
>>>>>>> feature-branch
```

- Between `<<<<<<< HEAD` and `=======`: your current branch.
- Between `=======` and `>>>>>>>`: the incoming changes.

Edit it to the final version you want and **delete all three marker lines**:

```js
const port = process.env.PORT || 3000;
```

Then mark it resolved and finish:

```bash
git add src/app.js
git commit                 # for a merge
git rebase --continue      # if you were rebasing
git cherry-pick --continue # if you were cherry-picking
```

## Take one side for a whole file

```bash
git checkout --ours   src/app.js    # keep your version
git checkout --theirs src/app.js    # take the incoming version
git add src/app.js
```

During a **rebase**, "ours" and "theirs" are swapped: `--ours` is the branch you're rebasing onto.

## Give up and go back

```bash
git merge --abort     # or: git rebase --abort
```

## Tools that help

- VS Code shows *Accept Current / Accept Incoming / Accept Both* buttons above each conflict.
- `git mergetool` opens a configured diff tool.
- `git diff --name-only --diff-filter=U` lists only conflicted files.

## Lock files

For `package-lock.json`, `yarn.lock` or `poetry.lock`, don't hand-edit. Take either version and regenerate: `git checkout --theirs package-lock.json && npm install`, then `git add` it.
