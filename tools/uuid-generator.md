---
name: "UUID generator & validator (v4, v7)"
title: "UUID Generator (v4 & v7) and UUID Validator — bulk, offline"
h1: "UUID generator (v4, v7) and validator"
description: "Generate random UUID v4 or time-ordered UUID v7 in bulk (up to 1000), uppercase or without hyphens. Validate any UUID and see its version, variant and embedded timestamp. Runs in your browser."
intro: "Generate up to 1000 UUIDs at once (random v4 or time-ordered v7), or paste a UUID to check that it is valid and see its version, variant and timestamp."
order: 10
js: uuid
keywords: "uuid generator guid generator uuid v4 uuid v7 random uuid online bulk uuid validator uuid version check decode uuid timestamp"
related: [db-postgres-duplicate-key-value-violates-unique-constraint, python-object-of-type-is-not-json-serializable, js-each-child-in-a-list-should-have-a-unique-key-prop]
---
## v4 or v7?

**UUID v4** is 122 random bits. It is the default almost everywhere (`crypto.randomUUID()`, Python `uuid.uuid4()`, Postgres `gen_random_uuid()`). Use it when the ID must reveal nothing.

**UUID v7** (RFC 9562, 2024) starts with a 48-bit Unix timestamp in milliseconds, followed by random bits. New IDs sort after old ones, so they behave much better as database primary keys: inserts go to the end of a B-tree index instead of random pages, which keeps indexes smaller and inserts faster in Postgres and MySQL. The trade-off: anyone can read the creation time from the ID. This tool's v7 generator adds a counter so that even IDs created in the same millisecond are strictly increasing.

The generator uses your browser's cryptographically secure random source (`crypto.getRandomValues` / `crypto.randomUUID`), never `Math.random`.

## Anatomy of a UUID

`xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`: 32 hex digits in groups of 8-4-4-4-12. **M** is the version (1-8). **N** is the variant: `8`, `9`, `a` or `b` means a standard RFC 9562 UUID; `c`/`d` is a legacy Microsoft GUID. The nil UUID (all zeros) and max UUID (all `f`) are special values.

| Version | Contents |
|---|---|
| 1 | 100-ns timestamp since 1582 + MAC address |
| 3 / 5 | MD5 / SHA-1 hash of a namespace and a name |
| 4 | random |
| 6 | v1 timestamp reordered to sort correctly |
| 7 | Unix millisecond timestamp + random |

## Common problems

- **"not a valid UUID"**: usually braces, a `urn:uuid:` prefix, whitespace or a truncated copy. The validator accepts and strips braces and prefixes, and points to the first invalid character.
- **Case**: UUIDs are case-insensitive, but string comparison in code is not. Normalize to lowercase before comparing or storing as text.
- **JSON**: Python's `json.dumps` cannot serialize `uuid.UUID` objects; convert with `str(u)`.
- **Storage**: store UUIDs in a native `uuid` column (Postgres) or `BINARY(16)` (MySQL), not `VARCHAR(36)`.
