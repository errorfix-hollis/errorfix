---
name: "SQL formatter"
title: "SQL Formatter & Beautifier — pretty-print or minify SQL queries online"
h1: "SQL formatter and beautifier"
description: "Free online SQL formatter: pretty-print SELECT, INSERT, UPDATE, DELETE and CREATE TABLE statements with joins, subqueries, CASE and CTEs, uppercase keywords, choose the indent, or minify to one line."
intro: "Paste a query to indent it clause by clause, with JOINs, subqueries, CASE expressions and WITH (CTE) blocks laid out readably. Works for MySQL, PostgreSQL, SQLite and SQL Server syntax."
order: 15
js: sql
keywords: "sql formatter sql beautifier format sql online pretty print sql query minify sql mysql postgresql uppercase keywords cte join subquery"
related: [db-mysql-error-1064-you-have-an-error-in-your-sql-syntax, db-postgres-column-does-not-exist, db-postgres-relation-does-not-exist, db-postgres-operator-does-not-exist-integer-text]
---
## How the formatter lays out a query

Each main clause (`SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `SET`, `VALUES`, `RETURNING`) starts a new line, and the items inside it are indented below it, one per line. `JOIN`s are indented under `FROM`, and top-level `AND`/`OR` conditions get their own lines so you can comment them out one at a time. Subqueries and CTE bodies are indented one level deeper. Parentheses that are not subqueries (function calls, `IN (1, 2, 3)`, window clauses like `OVER (PARTITION BY …)`) stay on one line.

String literals, quoted identifiers (`"col"`, `` `col` ``, `[col]`), PostgreSQL dollar-quoted bodies (`$$…$$`) and comments are never changed. Only unquoted keywords and built-in function names are re-cased, which is safe because SQL keywords are case-insensitive.

## Use it to find syntax errors

A formatter is a quick way to spot the cause of [MySQL error 1064](/database/db-mysql-error-1064-you-have-an-error-in-your-sql-syntax/) and similar parse errors:

- **A clause in the wrong order.** After formatting, the order must be `SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT`.
- **A missing or extra comma.** A list item without a trailing comma ends up on the same line as the next one, and `SELECT a, b, FROM t` leaves a dangling comma before `FROM`.
- **Unbalanced parentheses or quotes.** The tool warns you about an unclosed `(` or string.
- **Reserved words used as names.** A column called `order`, `group` or `key` gets uppercased like a keyword: quote it with backticks (MySQL) or double quotes (PostgreSQL).

In PostgreSQL, a mixed-case identifier that is not quoted is folded to lowercase, which is the usual reason for [column does not exist](/database/db-postgres-column-does-not-exist/) and [relation does not exist](/database/db-postgres-relation-does-not-exist/).

## Minify

**Minify** removes comments and line breaks, which is handy for log lines, one-line `psql -c "…"` commands or embedding a query in JSON. Watch out: a `--` comment inside a minified query would comment out the rest of the line, which is why minify strips comments.
