---
error: "ERROR: column must appear in the GROUP BY clause or be used in an aggregate function"
error_full: |
  ERROR:  column "orders.created_at" must appear in the GROUP BY clause or be used in an aggregate function
  LINE 1: SELECT customer_id, created_at, count(*) FROM orders GROUP BY customer_id;
                              ^
cat: database
description: "In a GROUP BY query, every selected (or ORDER BY) column must either be grouped or aggregated, because each output row stands for many input rows and PostgreSQL won't pick one value for you. Add the column to GROUP BY, wrap it in an aggregate, or use DISTINCT ON / a window function."
tldr: "Decide what you want per group: add the column to `GROUP BY` (`GROUP BY customer_id, created_at`), aggregate it (`max(created_at)`, `string_agg(name, ', ')`), or group by the table's primary key so its other columns are allowed. For \"the latest row per group\" use `SELECT DISTINCT ON (customer_id) ... ORDER BY customer_id, created_at DESC`."
keywords: postgres postgresql error column must appear in the group by clause or be used in an aggregate function group by aggregate max string_agg distinct on window function row_number any_value mysql only_full_group_by 1055
related: [db-postgres-column-does-not-exist, db-postgres-relation-does-not-exist, db-mysql-error-1064-you-have-an-error-in-your-sql-syntax]
---
## What it means

`GROUP BY customer_id` collapses all rows with the same `customer_id` into one output row. If you also select `created_at`, there may be dozens of different values in that group, and SQL doesn't define which one to show. PostgreSQL follows the standard and rejects the query. (MySQL with `ONLY_FULL_GROUP_BY`, the default since 5.7, gives the equivalent error 1055.)

The fix depends on which value you actually want. You can reformat long queries with the [SQL formatter](/tools/sql-formatter/) to see all selected columns at a glance.

## Fix 1: you want one row per combination

If every distinct combination should be its own row, group by all of them:

```sql
SELECT customer_id, created_at::date AS day, count(*)
FROM orders
GROUP BY customer_id, created_at::date;
```

You can also refer to output columns by position or alias: `GROUP BY 1, 2` or `GROUP BY customer_id, day`.

## Fix 2: you want a summary of the column

Aggregate it:

```sql
SELECT customer_id,
       count(*)                     AS orders,
       max(created_at)              AS last_order,
       min(created_at)              AS first_order,
       string_agg(status, ', ')     AS statuses,
       array_agg(id ORDER BY id)    AS order_ids
FROM orders
GROUP BY customer_id;
```

If you know all values in the group are identical and you just need any one of them, PostgreSQL 16+ has `any_value(col)`; on older versions `min(col)` or `max(col)` does the job.

## Fix 3: group by the primary key

PostgreSQL allows other columns of a table when you group by that table's primary key, because they are functionally dependent on it:

```sql
SELECT c.id, c.name, c.email, count(o.id) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id;            -- c.name, c.email allowed: c.id is the PK
```

This works only for the primary key (not for a unique index) and only for columns of that same table.

## Fix 4: you want the whole latest (or first) row per group

That's not really aggregation. Use `DISTINCT ON`, a PostgreSQL extension:

```sql
SELECT DISTINCT ON (customer_id) customer_id, id, created_at, total
FROM orders
ORDER BY customer_id, created_at DESC;
```

Or a window function, which is portable across databases:

```sql
SELECT *
FROM (
  SELECT o.*, row_number() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn
  FROM orders o
) t
WHERE rn = 1;
```

## Fix 5: you want per-row data plus a group total

Window aggregates keep every row and add the group value next to it, no `GROUP BY` needed:

```sql
SELECT id, customer_id, total,
       sum(total) OVER (PARTITION BY customer_id) AS customer_total
FROM orders;
```

## Cause: ORDER BY or HAVING on an ungrouped column

The rule also applies outside the select list:

```sql
-- Error: created_at is neither grouped nor aggregated
SELECT customer_id, count(*) FROM orders GROUP BY customer_id ORDER BY created_at;

-- Fix
SELECT customer_id, count(*) FROM orders GROUP BY customer_id ORDER BY max(created_at) DESC;
```

## Coming from MySQL

Older MySQL setups often had `ONLY_FULL_GROUP_BY` disabled, so queries that silently returned an arbitrary value now fail in PostgreSQL. Don't look for a setting to turn this off: there isn't one. Rewrite with one of the fixes above.
