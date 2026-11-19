---
error: "ERROR: value too long for type character varying(255)"
error_full: |
  ERROR:  value too long for type character varying(255)
  SQL state: 22001
cat: database
description: "You inserted or updated a string longer than the column's `varchar(n)` limit. PostgreSQL never silently truncates, so the statement fails with SQLSTATE 22001."
tldr: "Widen the column: `ALTER TABLE t ALTER COLUMN col TYPE varchar(1000);` or switch to `text` (no length limit, same performance): `ALTER TABLE t ALTER COLUMN col TYPE text;`. Or validate/truncate input in the app: `left(value, 255)`."
keywords: postgres value too long for type character varying 255 sqlstate 22001 string_data_right_truncation varchar alter column type text hibernate jpa length
related: [db-postgres-duplicate-key-value-violates-unique-constraint, db-postgres-column-does-not-exist, db-mysql-specified-key-was-too-long]
---
## What it means

The column is declared as `varchar(n)` (alias `character varying(n)`) and the value has more than `n` **characters**. PostgreSQL rejects it instead of cutting it off. The same error exists for `character(n)`: `value too long for type character(10)`.

The message doesn't name the column. Find candidates:

```sql
SELECT table_name, column_name, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND character_maximum_length = 255;
```

Then compare with your data, e.g. `SELECT max(length(col)) FROM staging;` or log the values in the app.

## Cause 1: the column is just too small

**Fix:** widen it or use `text`. In PostgreSQL `text` and `varchar` are stored identically and perform the same; `varchar(n)` only adds a length check.

```sql
ALTER TABLE users ALTER COLUMN bio TYPE text;
-- or keep a limit
ALTER TABLE users ALTER COLUMN bio TYPE varchar(2000);
```

Increasing a `varchar` length (or changing to `text`) doesn't rewrite the table, so it's fast. If a view depends on the column, you must drop and recreate the view first.

If you want a limit but a friendlier failure, use `text` plus a check constraint:

```sql
ALTER TABLE users ADD CONSTRAINT bio_len CHECK (char_length(bio) <= 5000);
```

## Cause 2: ORM default of 255

JPA/Hibernate maps `String` to `varchar(255)` by default. Django `CharField` requires `max_length`, and Rails/Laravel string columns default to 255 in many setups.

```java
@Column(length = 2000)           // or:
@Column(columnDefinition = "text")
private String description;
```

```python
# Django
description = models.TextField()
```

Then generate and apply a migration — changing the annotation alone doesn't alter an existing table unless `ddl-auto=update` is used (and it often doesn't widen columns).

## Cause 3: wrong value in the wrong column

If a short column (e.g. `varchar(2)` country code) suddenly gets long values, check the column order in your `INSERT` or `COPY`. A missing column list maps values positionally:

```sql
-- Risky
INSERT INTO users VALUES ('Alice', 'alice@example.com', 'ZA');
-- Explicit
INSERT INTO users (name, email, country) VALUES ('Alice', 'alice@example.com', 'ZA');
```

For CSV imports, check delimiters and quoting — an unquoted comma shifts every field.

## Cause 4: you really want truncation

Truncate explicitly:

```sql
INSERT INTO logs (message) VALUES (left($1, 255));
```

An explicit cast also truncates without error: `'long string'::varchar(255)`. Do this only when losing data is acceptable.

## Multi-byte characters

The limit counts characters, not bytes, so emoji and accented letters count as one each. If your app checks byte length (e.g. `len(s.encode())`), it may be stricter than the database — that's not the cause of this error.
