---
error: "ERROR 1215 (HY000): Cannot add foreign key constraint"
error_full: |
  ERROR 1215 (HY000): Cannot add foreign key constraint
  ERROR 3780 (HY000): Referencing column 'user_id' and referenced column 'id' in foreign key constraint 'fk_orders_user' are incompatible.
  ERROR 1822 (HY000): Failed to add the foreign key constraint. Missing index for constraint 'fk_orders_user' in the referenced table 'users'
cat: database
description: "MySQL refused to create a foreign key because the two columns don't match exactly, the referenced column isn't indexed, the referenced table doesn't exist yet, or the engine isn't InnoDB. SHOW ENGINE INNODB STATUS shows the exact reason."
tldr: "Run `SHOW ENGINE INNODB STATUS\\G` and read LATEST FOREIGN KEY ERROR. Make both columns the same type, length and signedness (e.g. both `BIGINT UNSIGNED`) and the same charset/collation, make the referenced column a PRIMARY KEY or indexed, create the parent table first, and use ENGINE=InnoDB."
keywords: mysql error 1215 cannot add foreign key constraint error 3780 incompatible error 1822 missing index for constraint unsigned int bigint collation innodb references
related: [db-mysql-error-1452-cannot-add-or-update-a-child-row, db-mysql-error-1451-cannot-delete-or-update-a-parent-row, db-mysql-specified-key-was-too-long]
---
## What it means

A foreign key requires the child column and the parent column to be strictly compatible, and the parent column to be indexed. Error 1215 is the generic message; MySQL 8.0 often gives a more specific one (3780 for type mismatch, 1822 for missing index). Get the real reason:

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `LATEST FOREIGN KEY ERROR` section.

## Cause 1: column types don't match exactly

Type, size and `UNSIGNED` must match. This is the most common cause — especially Laravel/Rails-style `BIGINT UNSIGNED` ids referenced by a plain `INT`:

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT,                                -- wrong: INT signed
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Fix the child column:

```sql
ALTER TABLE orders MODIFY user_id BIGINT UNSIGNED;
ALTER TABLE orders ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id) REFERENCES users(id);
```

Compare definitions with `SHOW CREATE TABLE users;` and `SHOW CREATE TABLE orders;`. (`VARCHAR` lengths may differ, but `INT` vs `BIGINT` or signed vs unsigned may not.)

## Cause 2: string columns with different charset/collation

For `VARCHAR`/`CHAR` keys, both columns need the same character set and collation:

```sql
SELECT table_name, column_name, character_set_name, collation_name
FROM information_schema.columns
WHERE table_schema = DATABASE() AND column_name IN ('code', 'country_code');

ALTER TABLE orders MODIFY country_code VARCHAR(2)
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

This often appears when old `utf8`/`latin1` tables meet new `utf8mb4` ones.

## Cause 3: referenced column isn't indexed

The parent column must be the leftmost column of an index (normally the PRIMARY KEY or a UNIQUE key):

```sql
ALTER TABLE users ADD UNIQUE INDEX ux_users_email (email);
```

For a composite foreign key, the columns must appear in the same order as in the parent index.

## Cause 4: parent table doesn't exist yet (or is MyISAM)

Create tables in dependency order, or load dumps with checks off:

```sql
SET FOREIGN_KEY_CHECKS = 0;
-- CREATE TABLE ... / SOURCE dump.sql
SET FOREIGN_KEY_CHECKS = 1;
```

Both tables must be InnoDB:

```sql
SELECT table_name, engine FROM information_schema.tables WHERE table_schema = DATABASE();
ALTER TABLE users ENGINE=InnoDB;
```

Also check spelling and case of table names — on Linux, table names are case-sensitive by default.

## Cause 5: ON DELETE SET NULL on a NOT NULL column

```sql
user_id BIGINT UNSIGNED NOT NULL,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL   -- invalid
```

Make the column nullable or use `ON DELETE CASCADE` / `RESTRICT`.

## Cause 6: duplicate constraint name

Constraint names are unique per database. Reusing `fk_user` on two tables fails (error 1826 in newer versions, 1215/121 in older). Use names like `fk_<table>_<column>`.

## Existing data violates the key

If the constraint definition is fine but existing rows reference missing parents, you'll get error 1452 instead — see [Cannot add or update a child row](/database/db-mysql-error-1452-cannot-add-or-update-a-child-row/).
