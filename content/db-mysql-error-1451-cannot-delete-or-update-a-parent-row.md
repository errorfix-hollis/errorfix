---
error: "ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails"
error_full: |
  ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails (`shop`.`orders`, CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`))
cat: database
description: You tried to delete (or change the key of) a row that other rows still reference through a foreign key. MySQL blocks it so the child rows don't end up pointing at nothing.
tldr: "Delete or re-point the child rows first (`DELETE FROM orders WHERE customer_id = 42;` then delete the parent), or change the constraint to `ON DELETE CASCADE` / `ON DELETE SET NULL`. For DROP/TRUNCATE in a controlled reset only: `SET FOREIGN_KEY_CHECKS = 0;` ... `SET FOREIGN_KEY_CHECKS = 1;`."
keywords: mysql error 1451 23000 cannot delete or update a parent row a foreign key constraint fails on delete cascade set null foreign_key_checks truncate drop table mariadb
related: [db-mysql-error-1452-cannot-add-or-update-a-child-row, db-mysql-error-1062-duplicate-entry, db-mysql-error-1205-lock-wait-timeout-exceeded]
---
## What it means

The message names the **child** table and the constraint:

```text
(`shop`.`orders`, CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`)
 REFERENCES `customers` (`id`))
```

Read it as: rows in `orders.customer_id` reference `customers.id`, and the row you're deleting/updating in `customers` is one of them. The default foreign key action is `RESTRICT` (`NO ACTION` behaves the same in InnoDB), so MySQL refuses.

Error 1452 is the mirror image: inserting a child that references a parent that doesn't exist.

## Find the rows that block you

```sql
SELECT * FROM orders WHERE customer_id = 42;
```

To see every foreign key that points at a table:

```sql
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = 'shop'
  AND REFERENCED_TABLE_NAME = 'customers';
```

`SHOW ENGINE INNODB STATUS\G` also has a `LATEST FOREIGN KEY ERROR` section with the exact row.

## Fix 1: delete the children first (in a transaction)

```sql
START TRANSACTION;
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = 42);
DELETE FROM orders WHERE customer_id = 42;
DELETE FROM customers WHERE id = 42;
COMMIT;
```

Work from the deepest child up. A multi-table delete also works: `DELETE o, c FROM orders o JOIN customers c ON c.id = o.customer_id WHERE c.id = 42;` — but MySQL doesn't guarantee the order, so it can still hit 1451; separate statements are safer.

## Fix 2: re-point or detach the children

If the child rows should survive:

```sql
UPDATE orders SET customer_id = NULL WHERE customer_id = 42;   -- column must be NULLable
-- or move them to another parent
UPDATE orders SET customer_id = 7 WHERE customer_id = 42;
```

## Fix 3: change the constraint's ON DELETE action

If deleting a parent should always remove or detach its children, encode that in the schema. You must drop and re-create the foreign key:

```sql
ALTER TABLE orders DROP FOREIGN KEY orders_ibfk_1;
ALTER TABLE orders
  ADD CONSTRAINT orders_customer_fk
  FOREIGN KEY (customer_id) REFERENCES customers(id)
  ON DELETE CASCADE        -- or ON DELETE SET NULL
  ON UPDATE CASCADE;
```

`CASCADE` deletes children automatically (and their children, if those constraints cascade too) — powerful, and dangerous on important data. `SET NULL` keeps the children with a NULL key. Consider soft-deleting the parent instead (`UPDATE customers SET deleted_at = NOW()`).

In ORMs this is configured on the relation, e.g. Django `on_delete=models.CASCADE`, Laravel `->cascadeOnDelete()`, JPA `cascade = CascadeType.REMOVE` / `orphanRemoval` (JPA cascades in the application, not the DB).

## Fix 4: updating a primary key

`UPDATE customers SET id = 100 WHERE id = 42` fails the same way. Use `ON UPDATE CASCADE` on the foreign key, or better, don't change primary keys — use a separate business key column.

## Fix 5: TRUNCATE or DROP TABLE

`TRUNCATE TABLE customers` fails with a related error (1701) whenever *any* foreign key references the table, even if no rows match. `DROP TABLE` on a referenced table fails too (error 3730 on MySQL 8, 1217 on older versions). When intentionally resetting data (tests, seed scripts), disable checks for the session:

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE customers;
SET FOREIGN_KEY_CHECKS = 1;
```

This only affects your session, but it lets you leave orphaned rows behind, so never use it as a workaround in application code. Alternatively drop the tables in child-to-parent order.

## Fix 6: mysqldump imports

Dumps made with `mysqldump` already include `SET FOREIGN_KEY_CHECKS=0` at the top. If you hit 1451 while restoring a hand-edited or partial dump, add that line back or load tables in parent-first order.
