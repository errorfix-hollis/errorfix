---
error: "fatal: not a git repository (or any of the parent directories): .git"
cat: git
description: You ran a git command outside a repository. cd into the project folder, or run git init / git clone first.
tldr: "`cd` into the folder that contains your project's `.git` directory, or run `git init` to create a new repository there."
keywords: not a git repository parent directories .git folder missing
---
## What it means

Git looked for a `.git` folder in the current directory and every parent directory and found none, so it doesn't know which repository you mean.

## Fixes

**You are in the wrong folder.** Check where you are and move into the project:

```bash
pwd
cd path/to/your/project
git status
```

**The project was never a repository.** Create one:

```bash
git init
```

**You downloaded a ZIP instead of cloning.** ZIP downloads from GitHub don't include history. Clone instead:

```bash
git clone https://github.com/USER/REPO.git
```

**The `.git` folder was deleted or moved.** If you have a remote copy, clone it again and copy your changed files over. Without a remote, the history is gone, but `git init` lets you start a new one.

**Inside Docker or CI.** Build contexts often exclude `.git` (for example via `.dockerignore`). Pass the info you need (like a commit hash) as a build argument instead of running git inside the container, or include `.git` in the context.

**`safe.directory` in newer Git.** If the folder belongs to another user, Git prints a different error, `detected dubious ownership in repository`. See the related fix below.
