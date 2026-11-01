---
name: "Regex tester"
title: "Regex Tester (JavaScript) — highlight matches and capture groups"
h1: "Regex tester (JavaScript)"
description: "Test JavaScript regular expressions live: highlight every match, list capture groups and named groups, try replacements, and see syntax errors. Runs in your browser."
intro: "Enter a JavaScript regular expression and some text to highlight every match and inspect its capture groups as you type."
order: 8
js: regex
keywords: "regex tester javascript regex online regular expression tester regexp capture groups named groups replace"
related: [js-is-not-a-function, python-keyerror]
---
## Flags

| Flag | Name | Effect |
|---|---|---|
| `g` | global | find all matches, not just the first |
| `i` | ignore case | `a` matches `A` |
| `m` | multiline | `^` and `$` match at every line break |
| `s` | dotAll | `.` also matches newlines |
| `u` | unicode | full Unicode, `\u{1F600}` and `\p{L}` escapes |
| `v` | unicodeSets | `u` plus set operations in classes (newer browsers) |
| `y` | sticky | match only at `lastIndex` |
| `d` | indices | record start/end of each group |

## Cheat sheet

| Pattern | Matches |
|---|---|
| `.` | any character except newline |
| `\d` `\w` `\s` | digit, word character `[A-Za-z0-9_]`, whitespace |
| `\D` `\W` `\S` | the opposites |
| `[abc]` `[^abc]` `[a-z]` | one of, none of, range |
| `^` `$` `\b` | start, end, word boundary |
| `*` `+` `?` `{2,5}` | 0+, 1+, optional, 2 to 5 times |
| `*?` `+?` | lazy (as few as possible) |
| `(…)` `(?:…)` `(?<name>…)` | capture, non-capturing, named group |
| `a\|b` | a or b |
| `(?=…)` `(?!…)` `(?<=…)` `(?<!…)` | lookahead, negative lookahead, lookbehind, negative lookbehind |
| `\1` `\k<name>` | backreference |

## JavaScript-specific gotchas

- In a string, backslashes must be doubled: `new RegExp("\\d+")` equals `/\d+/`. This tester takes the pattern as you would write it between slashes.
- `str.match(/x/g)` returns only the matched strings, without groups; use `str.matchAll(/x/g)` to get groups for every match. `matchAll` and `replaceAll` throw a TypeError if the regex lacks the `g` flag.
- A global regex keeps state in `lastIndex`, so calling `re.test()` repeatedly on different strings can alternate between `true` and `false`.
- Calling `.match()` on something that is not a string fails with [x.match is not a function](/javascript/js-is-not-a-function/); convert with `String(x)` first.
- Patterns like `(a+)+$` can backtrack catastrophically on long inputs and freeze the page (ReDoS). Prefer specific character classes over nested quantifiers.

Python's `re`, PCRE (PHP) and Go's RE2 differ in details: Python uses `(?P<name>…)`, and RE2 has no lookarounds or backreferences.
