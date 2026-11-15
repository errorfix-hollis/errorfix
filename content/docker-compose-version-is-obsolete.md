---
error: "the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
error_full: |
  WARN[0000] /home/me/app/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion
cat: docker
description: "Docker Compose v2 follows the Compose Specification, which has no version field. The warning is harmless. Delete the version line from the top of your compose file."
tldr: "Delete the `version: \"3.8\"` (or similar) line at the top of `docker-compose.yml` / `compose.yaml`. Nothing else changes: Compose v2 already ignores it. If the project must still work with the old Python `docker-compose` v1, keep the line or upgrade those machines to `docker compose` v2."
keywords: docker compose the attribute version is obsolete it will be ignored please remove it warn compose specification version 3.8 docker-compose.yml compose.yaml v2
related: [docker-compose-command-not-found, docker-compose-service-refers-to-undefined-volume, docker-found-orphan-containers]
---
## What it means

Older Compose files started with a schema version:

```yaml
version: "3.8"
services:
  web:
    image: nginx
```

The `version` key selected a file format (2.x or 3.x) in the old Python `docker-compose` (v1). Docker Compose v2 (`docker compose`, written in Go) implements the **Compose Specification**, which merges all those formats and doesn't use `version`. Since Compose v2.25 it prints this warning whenever the key is present.

The warning changes nothing: the file is parsed the same with or without the line, and containers aren't affected.

## Fix: remove the line

```yaml
services:
  web:
    image: nginx
    ports:
      - "8080:80"
```

Remove it in place with sed (keeps a backup):

```bash
sed -i.bak '/^version:/d' docker-compose.yml
docker compose config --quiet && echo OK
```

`docker compose config` validates the file and prints the fully resolved configuration. It's a good check after editing. A [YAML validator](/tools/yaml-validator/) also catches indentation mistakes.

If you have several files (`docker-compose.override.yml`, `compose.prod.yaml`), the warning names each one. Remove the line from all of them.

## "But I need 3.x features"

There's nothing to lose. Every option from formats 2.x and 3.x (`deploy`, `depends_on` with `condition: service_healthy`, `extends`, healthchecks, profiles, `secrets`) is valid in the Compose Specification without a version line. Some 2.x-only options (`mem_limit`, `cpus`) that 3.x dropped work again.

## When to keep it

Keep `version:` only if the same file must still work with **docker-compose v1** (`docker-compose` with a hyphen, Python). v1 requires the key for 3.x features. v1 has been end-of-life since 2023 and doesn't run on current Python versions, so the better fix is to upgrade those machines:

```bash
docker compose version          # v2 plugin present?
sudo apt-get install docker-compose-plugin    # Docker's apt repo
```

See [docker-compose: command not found](/docker/docker-compose-command-not-found/) if only the old command exists.

## Related warnings and errors

- `name` at the top level is now allowed and sets the project name (instead of the folder name or `-p`).
- `services.web Additional property foo is not allowed`: a typo or misplaced key, not a version problem. Check the indentation.
- `obsolete` warnings for other keys follow the same rule: remove them and run `docker compose config` to confirm.
- The preferred file name is now `compose.yaml`. `docker-compose.yml` still works, and Compose looks for both.

## Silence it in CI without editing?

There's no flag to disable just this warning. Edit the file; it's a one-line change and keeps logs clean.
