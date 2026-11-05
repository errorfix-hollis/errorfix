---
error: "ERROR 1452 (23000): Cannot add or update a child row: a foreign key constraint fails"
error_full: |
  ERROR 1452 (23000): Cannot add or update a child row: a foreign key constraint fails (`shop`.`orders`, CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`))
cat: database
description: You inserted or updated a row whose foreign key value has no matching row in the parent table. Insert the parent first, fix the value, or clean up orphan rows before adding the constraint.
tldr: "Check the parent exists: `SELECT id FROM customers WHERE id = <value>;`. Insert parent rows before child rows (or wrap a dump import in `SET FOREIGN_KEY_CHECKS=0; ... SET FOREIGN_KEY_CHECKS=1;`). When adding a constraint to existing data, find orphans with a `LEFT JOIN ... WHERE parent.id IS NULL` and fix or delete them first."
keywords: mysql error 1452 23000 cannot add or update a child row a foreign key constraint fails foreign_key_checks orphan rows alter table add constraint mariadb insert order
related: [db-mysql-error-1062-duplicate-entry, db-mysql-error-1205-lock-wait-timeout-exceeded, db-postgres-relation-does-not-exist]
---
## What it means

A foreign key says "every `orders.customer_id` must exist in `customers.id`". MySQL rejected a row that would break that rule. The error tells you the child table (`shop.orders`), the constraint name, the column and the parent table/column.

Check the value you're inserting against the parent:

```sql
SELECT id FROM customers WHERE id = 42;
SHOW CREATE TABLE orders\G
```

## Cause 1: the parent row doesn't exist (yet)

Insert in dependency order: parents first, then children.

```sql
START TRANSACTION;
INSERT INTO customers (id, name) VALUES (42, 'Alice');
INSERT INTO orders (customer_id, total) VALUES (42, 9.99);
COMMIT;
```

In application code, use the id the database actually generated for the parent (`LAST_INSERT_ID()`, `cursor.lastrowid`, ORM relationship) instead of a guessed or hard-coded one.

## Cause 2: wrong value — 0, empty string, or wrong column

A form sending `0` or `''` instead of `NULL`, or an off-by-one mapping, produces ids that don't exist. If the relation is optional, make the column nullable and send `NULL` — foreign keys don't check `NULL` values:

```sql
ALTER TABLE orders MODIFY customer_id INT NULL;
INSERT INTO orders (customer_id, total) VALUES (NULL, 9.99);
```

## Cause 3: importing a dump or CSV in the wrong order

Dumps from `mysqldump` already disable checks at the top. For your own scripts or `LOAD DATA`, disable them for the session:

```sql
SET FOREIGN_KEY_CHECKS = 0;
SOURCE data.sql;
SET FOREIGN_KEY_CHECKS = 1;
```

MySQL does **not** re-validate existing rows when you turn checks back on, so verify afterwards (Cause 4 query). Only do this for trusted bulk loads.

## Cause 4: adding a foreign key to a table that has orphans

`ALTER TABLE orders ADD CONSTRAINT ... FOREIGN KEY (customer_id) REFERENCES customers(id)` fails with 1452 if any existing rows point to missing parents. Find them:

```sql
SELECT o.id, o.customer_id
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE o.customer_id IS NOT NULL AND c.id IS NULL;
```

Then fix them — set to `NULL`, point to a real parent, or delete:

```sql
UPDATE orders o LEFT JOIN customers c ON c.id = o.customer_id
SET o.customer_id = NULL
WHERE c.id IS NULL;
```

## Cause 5: mismatched types or collations

Both columns must have compatible types: `INT` vs `INT UNSIGNED` or `VARCHAR` with different charsets/collations usually fail when creating the constraint (error 3780 or 150), but string keys with different collations or trailing spaces can also make lookups miss. Align the definitions:

```sql
ALTER TABLE orders MODIFY customer_id INT UNSIGNED NOT NULL;
```

## Cause 6: parent and child on different databases or engines

Foreign keys require InnoDB on both tables (`SHOW TABLE STATUS` → `Engine`), and the parent must be in the database named in the constraint. A test database seeded from a different schema often lacks the parent rows.

## Related: error 1451

The opposite direction — deleting or updating a **parent** that still has children — gives `ERROR 1451: Cannot delete or update a parent row`. Delete children first, or define the constraint with `ON DELETE CASCADE` / `ON DELETE SET NULL`.
