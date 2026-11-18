---
error: "ERROR: operator does not exist: integer = text"
error_full: |
  ERROR:  operator does not exist: integer = text
  LINE 1: SELECT * FROM orders o JOIN users u ON o.user_id = u.id_text;
                                                          ^
  HINT:  No operator matches the given name and argument types. You might need to add explicit type casts.
cat: database
description: "PostgreSQL won't implicitly convert between text and numeric (or uuid, date) types when comparing. One side of the =, IN or JOIN condition has the wrong type; cast it explicitly or fix the column/parameter type."
tldr: "Cast one side so both match: `WHERE user_id = '42'::integer` or `WHERE user_id::text = $1`. Prefer casting the parameter, not the column, so indexes still work. In application code bind the value as a number (not a string). If a column stores numbers as text, migrate it: `ALTER TABLE t ALTER COLUMN c TYPE integer USING c::integer;`."
keywords: postgres operator does not exist integer = text character varying uuid bigint explicit type casts hint no operator matches jdbc hibernate setstring cast ::integer
related: [db-postgres-column-does-not-exist, db-postgres-relation-does-not-exist, db-postgres-current-transaction-is-aborted]
---
## What it means

In PostgreSQL every operator is defined for specific argument types. There is an `integer = integer` and a `text = text`, but no `integer = text`, and Postgres deliberately doesn't guess a conversion (unlike MySQL). The same error appears in many forms:

- `operator does not exist: integer = character varying`
- `operator does not exist: uuid = text`
- `operator does not exist: bigint = text`
- `operator does not exist: text = integer[]`

The caret in `LINE 1` points to the operator that failed.

## Cause 1: query parameter sent as a string

Most often the SQL is fine but the driver sends the value as text/varchar:

```java
// JDBC: wrong
ps.setString(1, "42");     // with WHERE id = ?
// right
ps.setInt(1, 42);
```

```python
# psycopg: pass an int, not "42"
cur.execute("SELECT * FROM users WHERE id = %s", (int(user_id),))
```

With Node `pg`, values are sent untyped and normally coerced, but if a query has an explicit `$1::text` or the parameter is used in two places with different types, you'll see this. Add a cast in SQL: `WHERE id = $1::int`.

In Spring Data / Hibernate, check that the entity field type matches the column (`Long` for `bigint`, `UUID` for `uuid`), and for native queries don't pass `String` where the column is numeric.

## Cause 2: joining columns of different types

```sql
SELECT * FROM orders o JOIN users u ON o.user_id = u.external_id;  -- int vs text
```

Cast in the query:

```sql
ON o.user_id::text = u.external_id
```

Or fix the schema so related columns share a type (better for indexes and foreign keys):

```sql
ALTER TABLE users
  ALTER COLUMN external_id TYPE integer USING external_id::integer;
```

`USING` fails if any row isn't a valid integer; find those first:

```sql
SELECT external_id FROM users WHERE external_id !~ '^-?[0-9]+$';
```

## Cause 3: cast the right side

Casting the column (`WHERE id::text = '42'`) works but stops Postgres from using an index on `id`. Cast the literal or parameter instead:

```sql
WHERE id = '42'::integer      -- or CAST('42' AS integer)
WHERE id = 42                 -- simply unquoted
```

## Cause 4: uuid compared with text

```sql
WHERE id = $1          -- id is uuid, $1 bound as varchar
WHERE id = $1::uuid    -- fix
```

In JDBC use `ps.setObject(1, UUID.fromString(s))`, or add `stringtype=unspecified` to the JDBC URL so string parameters are sent untyped and Postgres infers the type:

```
jdbc:postgresql://localhost:5432/mydb?stringtype=unspecified
```

## Cause 5: IN / ANY with an array of the wrong type

```sql
WHERE id = ANY($1)          -- $1 is text[] -> integer = text
WHERE id = ANY($1::int[])   -- fix
```

## Cause 6: date and enum comparisons

`date = text` usually comes from comparing to a formatted string parameter; cast `$1::date`. For enum columns: `WHERE status = $1::order_status`.

## Check the types

```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';
SELECT pg_typeof(user_id) FROM orders LIMIT 1;
```
