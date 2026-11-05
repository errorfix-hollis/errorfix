---
name: "Text diff checker"
title: "Text Diff Checker — compare two texts side by side online"
h1: "Text diff checker"
description: "Compare two texts or config files line by line. Side-by-side or unified diff view, changed characters highlighted, ignore whitespace or case, copy the result as a patch. Runs in your browser."
intro: "Paste two versions of a text, config file or code snippet to see exactly which lines were added, removed or changed."
order: 11
js: diff
keywords: "text diff online diff checker compare two texts compare files side by side diff unified diff patch compare config files find differences"
related: [git-merge-conflict, git-your-local-changes-would-be-overwritten, git-lf-will-be-replaced-by-crlf]
---
## How the diff works

The tool uses the Myers diff algorithm, the same one `git diff` uses by default. It finds the smallest set of added and removed lines that turns the original into the changed text. A line that was edited shows up as one removal plus one addition; in the side-by-side view such pairs are shown on the same row, with the changed characters highlighted.

- **Side by side** is easiest to read for config files and short documents.
- **Unified** is the format of `diff -u` and `git diff`: `-` lines are removed, `+` lines are added, and `@@ -12,7 +12,8 @@` headers give the starting line and length of each hunk in the old and new file. **Copy as patch** gives you text that `patch` or `git apply` can use.

## Ignore options

**Ignore whitespace** treats lines as equal when they differ only in spaces or tabs (indentation, trailing spaces, several spaces in a row), similar to `git diff -w`. Use it to review a re-indented file without noise. **Ignore case** compares lines case-insensitively, useful for SQL and HTML.

If every line shows as changed although the texts look identical, the cause is almost always invisible: different line endings (CRLF vs LF), a byte order mark, tabs vs spaces or trailing whitespace. Tick *Ignore whitespace* to confirm, then check the file with the [line ending & whitespace inspector](/tools/line-ending-whitespace-inspector/).

## Command-line equivalents

| Task | Command |
|---|---|
| Compare two files | `diff -u old.txt new.txt` |
| Ignore whitespace | `diff -uw old.txt new.txt` or `git diff -w` |
| Word-level changes | `git diff --word-diff` |
| Two files outside a repo | `git diff --no-index a.txt b.txt` |
| Apply a patch | `patch -p0 < change.diff` or `git apply change.diff` |

Both texts stay in your browser. Nothing is uploaded, so you can safely compare private configs, logs and code.
