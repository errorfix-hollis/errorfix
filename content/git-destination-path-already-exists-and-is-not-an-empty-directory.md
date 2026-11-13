---
error: "fatal: destination path 'X' already exists and is not an empty directory."
error_full: |
  $ git clone https://github.com/user/project.git
  fatal: destination path 'project' already exists and is not an empty directory.
cat: git
description: "git clone creates a new folder named after the repo, and a non-empty folder with that name already exists where you ran the command."
tldr: "Clone into a different folder: `git clone <url> project2`. If the existing folder is an old copy, update it instead (`cd project && git pull`) or delete it (`rm -rf project`). To clone into an existing non-empty folder, use `git init && git remote add origin <url> && git fetch && git checkout -t origin/main`."
keywords: git clone fatal destination path already exists and is not an empty directory clone into existing folder current directory git init remote add fetch checkout
related: [git-not-a-git-repository, git-refusing-to-merge-unrelated-histories, git-remote-origin-already-exists]
---
## What it means

`git clone <url>` creates a directory (by default the repo name) and checks out files into it. Git refuses to clone into a directory that already contains anything, so it never overwrites your files. Empty directories are fine.

Look at what's there:

```bash
ls -la project
git -C project status     # is it already a clone?
```

## Fix 1: it's an old clone — just update it

```bash
cd project
git remote -v        # confirm it's the same repo
git pull
```

## Fix 2: clone into a different directory name

The second argument to `git clone` sets the target folder:

```bash
git clone https://github.com/user/project.git project-new
```

## Fix 3: delete the existing folder and clone fresh

Only if you don't need what's in it:

```bash
rm -rf project
git clone https://github.com/user/project.git
```

On Windows PowerShell: `Remove-Item -Recurse -Force project`.

## Fix 4: clone into the current directory (`.`)

`git clone <url> .` works only if the current directory is empty. Hidden files count: an `.idea/`, `.DS_Store` or `.env` makes it "not empty". Check with `ls -la`.

## Fix 5: clone into an existing non-empty folder (keep your files)

Common when a server folder already has files, or you created a project locally before the repo existed:

```bash
cd project
git init
git remote add origin https://github.com/user/project.git
git fetch origin
git checkout -t origin/main        # or origin/master
```

If checkout complains `untracked working tree files would be overwritten`, those local files conflict with files in the repo. Move them aside, or overwrite them with the repo's version:

```bash
git checkout -f -t origin/main     # replaces conflicting local files!
```

If the folder already has its own commits, merge instead:

```bash
git pull origin main --allow-unrelated-histories
```

See [refusing to merge unrelated histories](/git/git-refusing-to-merge-unrelated-histories/).

## Fix 6: scripts and CI that clone repeatedly

Make the step idempotent:

```bash
if [ -d project/.git ]; then
  git -C project pull --ff-only
else
  git clone https://github.com/user/project.git project
fi
```

In a Dockerfile, a previous `COPY . .` may already have put files in the target; clone to a separate path or drop the duplicate copy.

## Same error from other tools

Tools that run `git clone` under the hood (plugin managers, Homebrew taps, install scripts) print the same message when their target folder already exists, often left over from an interrupted install. Remove or rename that folder and re-run the tool.
