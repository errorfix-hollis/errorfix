---
error: "warning: adding embedded git repository"
error_full: |
  warning: adding embedded git repository: vendor/lib
  hint: You've added another git repository inside your current repository.
  hint: Clones of the outer repository will not contain the contents of
  hint: the embedded repository and will not know how to obtain it.
  hint: If you meant to add a submodule, use:
  hint:
  hint: 	git submodule add <url> vendor/lib
  hint:
  hint: If you added this path by mistake, you can remove it from the
  hint: index with:
  hint:
  hint: 	git rm --cached vendor/lib
cat: git
description: A folder you staged contains its own .git directory, so Git records it as a pointer to a commit (a "gitlink") instead of its files. Others who clone get an empty folder.
tldr: "Unstage it: `git rm --cached vendor/lib`. Then either delete its `.git` folder (`rm -rf vendor/lib/.git`) and `git add vendor/lib` to include the files, or add it properly as a submodule: `git submodule add <url> vendor/lib`."
keywords: git warning adding embedded git repository submodule gitlink git rm --cached folder empty on github white arrow nested repo create-react-app
related: [git-not-a-git-repository, git-pathspec-did-not-match, git-gh001-large-files-detected]
---
## What it means

When `git add` finds a directory containing a `.git` folder, it doesn't add that directory's files. It adds a single special entry (mode `160000`, a *gitlink*) that records which commit the inner repository is at. Without a `.gitmodules` entry nobody else can fetch it, so on GitHub the folder shows as an unclickable folder with an arrow icon, and clones contain an empty directory.

Confirm it:

```bash
git ls-files -s vendor/lib
# 160000 3f2a...  0   vendor/lib     <- 160000 = gitlink
```

## Step 1: unstage the embedded repo

```bash
git rm --cached vendor/lib     # no trailing slash
```

This only removes it from the index; your files stay on disk. If you already committed, commit this removal too.

Then decide which of the following you want.

## Fix A: you want the files in your repo (most common)

Typical cause: you ran `npx create-react-app`, `cargo new`, `django-admin startproject` or `git clone` inside an existing repo, and the tool created its own `.git`.

```bash
rm -rf vendor/lib/.git         # Windows: rmdir /s /q vendor\lib\.git
git add vendor/lib
git commit -m "Add vendor/lib as regular files"
```

This throws away the inner repo's history. If you need that history, merge it with `git subtree add --prefix=vendor/lib <url> main` instead.

## Fix B: you want a submodule

If the folder is a separate project you want to track at a specific commit:

```bash
git rm --cached vendor/lib
rm -rf vendor/lib              # submodule add needs an empty/nonexistent path
git submodule add https://github.com/user/lib.git vendor/lib
git commit -m "Add lib as submodule"
```

Others then clone with:

```bash
git clone --recurse-submodules <repo-url>
# or after a normal clone:
git submodule update --init --recursive
```

## Fix C: you didn't want it at all

Add it to `.gitignore` after unstaging:

```bash
git rm --cached vendor/lib
echo "vendor/lib/" >> .gitignore
git commit -m "Ignore vendor/lib"
```

## Already pushed and the folder is empty on GitHub?

Same fix — remove the gitlink, add the real files, push:

```bash
git rm --cached vendor/lib
rm -rf vendor/lib/.git
git add vendor/lib
git commit -m "Replace gitlink with files"
git push
```

## Finding nested repositories

```bash
find . -mindepth 2 -name .git -not -path "./.git/*"
```

Every result (outside the root `.git`) is an embedded repository. Silence the warning only if you really want gitlinks: `git config advice.addEmbeddedRepo false`.
