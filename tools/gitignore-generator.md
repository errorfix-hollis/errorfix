---
name: ".gitignore generator & tester"
title: ".gitignore Generator & Tester — build a .gitignore and check if a file is ignored"
h1: ".gitignore generator and tester"
description: "Generate a .gitignore for Node, Python, Java, Go, Rust, Docker, Terraform, macOS, Windows, VS Code, JetBrains and more, then test which paths it ignores and which line matches, using git's exact pattern rules."
intro: "Tick the languages, tools and operating systems in your project to get a combined, de-duplicated .gitignore. Then paste file paths to see whether git would ignore them and which pattern decides, like git check-ignore -v."
order: 17
js: gitignore
keywords: "gitignore generator gitignore template node python java gitignore gitignore tester check if file is ignored git check-ignore gitignore not working gitignore syntax negation double asterisk"
related: [git-gh001-large-files-detected, git-gh013-repository-rule-violations, git-adding-embedded-git-repository, git-lf-will-be-replaced-by-crlf]
---
## Pattern rules (what the tester implements)

| Pattern | Matches |
|---|---|
| `*.log` | any file or folder ending in `.log`, at any depth (no slash means "match the name anywhere") |
| `build/` | a **directory** named `build` anywhere, plus everything inside it, but not a file called `build` |
| `/todo.txt` | only `todo.txt` at the repository root (a leading slash anchors the pattern) |
| `docs/*.md` | `.md` files directly in `docs/`, not in `docs/api/` (a slash in the middle also anchors) |
| `**/temp` | `temp` at any depth; `logs/**` = everything inside `logs`; `a/**/b` = `a/b`, `a/x/b`, `a/x/y/b` |
| `!keep.log` | re-include something an earlier pattern excluded (the last matching line wins) |
| `\#file`, `\!file` | a name that really starts with `#` or `!` |

The tester was checked against `git ls-files --ignored` and `git check-ignore` on more than a hundred paths.

## Why is my .gitignore not working?

- **The file is already tracked.** .gitignore only affects untracked files. Stop tracking it but keep the local copy with `git rm --cached path` (add `-r` for a folder) and commit.
- **A parent directory is excluded.** `!` cannot re-include a file inside an ignored directory, because git never looks inside it. Write `dir/*` and `!dir/keep.txt` instead of `dir/` and `!dir/keep.txt`.
- **Trailing spaces or a BOM.** `*.log ` with a trailing space does not match `a.log`. Windows editors sometimes save the file as UTF-16, which git cannot read.
- **Wrong place.** Patterns are relative to the folder the .gitignore lives in. Machine-specific junk (`.DS_Store`, IDE folders) can also go in a global file: `git config --global core.excludesFile ~/.gitignore_global`.

Ignore `node_modules/`, build output, large binaries and `.env` files *before* the first commit. Committing them is how people end up with [GH001: large files detected](/git/git-gh001-large-files-detected/) or [GH013 secret-scanning rejections](/git/git-gh013-repository-rule-violations/), and removing them later means rewriting history.
