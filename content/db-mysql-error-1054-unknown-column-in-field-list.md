---
error: "ERROR 1054 (42S22): Unknown column in 'field list'"
error_full: |
  ERROR 1054 (42S22): Unknown column 'emial' in 'field list'
  ERROR 1054 (42S22): Unknown column 'total' in 'where clause'
  ERROR 1054 (42S22): Unknown column 'u.id' in 'on clause'
cat: database
description: "MySQL couldn't match an identifier in your query to a column of the tables in scope. Typical causes are a typo or missing migration, a string value written without quotes (or in backticks), a SELECT alias used in WHERE, and table aliases used out of scope in joins."
tldr: "Check the real columns with `SHOW COLUMNS FROM table;` and fix the name. Quote string values with single quotes (`VALUES ('john')`, not `VALUES (john)` or `` (`john`) ``). Don't use SELECT aliases in WHERE: repeat the expression or use HAVING. In joins, use explicit `JOIN ... ON` instead of mixing commas and JOIN."
keywords: mysql error 1054 42S22 unknown column in field list where clause on clause order clause typo backticks quotes alias having join migration mariadb
related: [db-mysql-error-1064-you-have-an-error-in-your-sql-syntax, db-postgres-column-does-not-exist, db-mysql-error-1046-no-database-selected]
---
## What it means

The part in quotes at the end tells you **where** in the query MySQL failed to resolve the name:

| Message ends with | Location |
|---|---|
| `in 'field list'` | the SELECT list, or the column list / VALUES / SET of INSERT and UPDATE |
| `in 'where clause'` | WHERE |
| `in 'on clause'` | a JOIN condition |
| `in 'order clause'` / `'group statement'` / `'having clause'` | ORDER BY / GROUP BY / HAVING |

Start by listing what actually exists:

```sql
SHOW COLUMNS FROM users;
-- or
SELECT column_name FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'users';
```

## Cause 1: typo, renamed column, or migration not applied

`emial` vs `email`, `userId` vs `user_id`. Column names are not case-sensitive in MySQL, so case is rarely the issue; spelling is. If the column is new, check that the migration ran against *this* database (`SELECT DATABASE();`), not a local or test one.

## Cause 2: a string value without quotes

Unquoted words are treated as column names:

```sql
-- Wrong
INSERT INTO users (name) VALUES (john);
INSERT INTO users (name) VALUES (`john`);   -- backticks = identifier
SELECT * FROM users WHERE status = active;

-- Right
INSERT INTO users (name) VALUES ('john');
SELECT * FROM users WHERE status = 'active';
```

In application code, use parameterized queries instead of building SQL strings, which also prevents SQL injection:

```python
cur.execute("INSERT INTO users (name) VALUES (%s)", (name,))
```

Double quotes work as string quotes in default MySQL, but if `ANSI_QUOTES` is in `sql_mode` they become identifier quotes and cause this error. Single quotes are always safe.

## Cause 3: SELECT alias used in WHERE

WHERE is evaluated before the SELECT list, so aliases defined there don't exist yet:

```sql
-- Error: Unknown column 'total' in 'where clause'
SELECT price * qty AS total FROM order_items WHERE total > 100;

-- Fix: repeat the expression
SELECT price * qty AS total FROM order_items WHERE price * qty > 100;

-- or filter with HAVING (MySQL allows aliases there)
SELECT price * qty AS total FROM order_items HAVING total > 100;
```

## Cause 4: join scope ("on clause")

Mixing comma joins with explicit JOINs changes precedence: `JOIN` binds tighter than the comma, so the ON clause can't see the comma-joined table:

```sql
-- Error: Unknown column 'u.id' in 'on clause'
SELECT * FROM users u, orders o JOIN payments p ON p.user_id = u.id;

-- Fix: explicit joins throughout
SELECT *
FROM users u
JOIN orders o   ON o.user_id = u.id
JOIN payments p ON p.user_id = u.id;
```

Also check that each alias prefix (`u.`, `o.`) matches an alias you actually declared, and that you aren't using the original table name after giving it an alias.

## Cause 5: triggers, views and stored procedures

If the failing statement looks correct, a trigger on the table may reference a column that was dropped or renamed (`NEW.old_column`). Check with `SHOW TRIGGERS LIKE 'users';`. Views and procedures saved before a schema change fail in the same way; recreate them.

## Cause 6: ORM model out of sync

When the SQL is generated (Hibernate, Sequelize, Django, Laravel), the model has a field the table lacks. Log the generated SQL, then add a migration or fix the field-to-column mapping.
