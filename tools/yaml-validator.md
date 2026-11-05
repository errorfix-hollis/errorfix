---
name: "YAML validator & YAML ↔ JSON converter"
title: "YAML Validator & YAML to JSON Converter — exact error line and column"
h1: "YAML validator and YAML ↔ JSON converter"
description: "Validate YAML (Docker Compose, Kubernetes, GitHub Actions) and convert YAML to JSON or JSON to YAML. Shows the exact line and column of errors, catches tabs in indentation. Runs in your browser."
intro: "Paste YAML to validate it and convert it to JSON, or paste JSON to turn it into YAML. Errors show the line, the column and what is wrong."
order: 9
js: yaml
keywords: "yaml validator yaml lint yaml to json json to yaml converter docker compose yaml error kubernetes yaml mapping values are not allowed here found character that cannot start any token tab indentation"
related: [k8s-createcontainerconfigerror, k8s-crashloopbackoff, docker-compose-command-not-found, python-indentationerror-unexpected-indent]
---
## The YAML errors you will actually hit

| Error (PyYAML / Go / js-yaml wording) | Usual cause | Fix |
|---|---|---|
| `found character '\t' that cannot start any token` / `tab characters must not be used in indentation` | A tab in the indentation | Indent with spaces only |
| `mapping values are not allowed here` | A value contains `: ` (`title: Note: read me`), or a line is indented under a plain value | Quote the value, or fix the indentation |
| `did not find expected key` / `bad indentation of a mapping entry` | A key is indented one space too far or too little | Line keys up with their siblings |
| `did not find expected '-' indicator` | List items not aligned | Put every `- ` at the same column |
| `found undefined alias` | `*name` used before `&name` is defined | Define the anchor above the alias |
| `could not find expected ':'` | `key:value` with no space | Always write `key: value` |

The tool reports the position where the parser got stuck. For indentation errors, the real mistake is often the line **above** the highlighted one.

## Values that change type silently

YAML guesses types for unquoted values, and YAML 1.1 parsers (PyYAML, docker-compose v1, many Ruby tools) guess differently from YAML 1.2 ones:

- `yes`, `no`, `on`, `off` become booleans in YAML 1.1 — the "Norway problem" (`country: NO` turns into `false`).
- `0755` is octal 493 in YAML 1.1 but 755 in YAML 1.2; `22:22` is a base-60 number in YAML 1.1. Always quote port mappings in Compose files: `- "8080:80"`.
- Version numbers like `1.10` become the float `1.1`; long numeric IDs lose precision.

The validator flags these as warnings. When in doubt, quote strings.

## Block scalars: `|` vs `>`

`|` keeps line breaks exactly (scripts, certificates, config files). `>` folds lines into one paragraph. A trailing `-` (`|-`, `>-`) removes the final newline, `+` keeps all trailing blank lines.

## What is supported

Block mappings and sequences, flow `[ ]` and `{ }` collections, single- and double-quoted strings with escapes, comments, `|` and `>` block scalars, anchors, aliases and `<<` merge keys, tags like `!!str`, and multiple `---` documents (converted to a JSON array). Complex `? ` keys are not supported. Everything is parsed by JavaScript in your own browser; nothing is uploaded.
