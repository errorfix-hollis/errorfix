---
error: "Additional property is not allowed"
error_full: |
  validating /app/docker-compose.yml: services.web Additional property enviroment is not allowed
cat: docker
description: "Docker Compose validated your compose file against its schema and found a key it doesn't recognise at that position — usually a typo, wrong indentation, or a key placed under the wrong parent."
tldr: "Read the path in the message (`services.web` = the key is directly under the web service) and fix the named key: check spelling (`environment`, `depends_on`, `volumes`), indentation (2 spaces, no tabs) and nesting. Validate with `docker compose config`. Top-level custom keys must start with `x-`."
keywords: docker compose additional property is not allowed services validating yaml typo indentation x- extension fields docker-compose.yml schema invalid
related: [docker-compose-version-is-obsolete, docker-compose-service-refers-to-undefined-volume, k8s-error-converting-yaml-to-json-mapping-values-are-not-allowed]
---
## What it means

Compose checks your file against the Compose Specification JSON schema before doing anything. Each level only allows certain keys. The message tells you where and what:

```
services.web Additional property enviroment is not allowed
└── path ──┘                     └ the bad key ┘
```

Older docker-compose v1 printed the same thing as `Unsupported config option for services.web: 'enviroment'` or `Additional properties are not allowed ('enviroment' was unexpected)`.

Run this to see the error and, once fixed, the fully resolved file:

```bash
docker compose config
```

You can also check plain YAML syntax in the [YAML validator](/tools/yaml-validator/).

## Cause 1: typo in a key name

Common misspellings:

| Wrong | Right |
|---|---|
| `enviroment`, `environments` | `environment` |
| `depends-on`, `dependsOn` | `depends_on` |
| `volume` (inside a service) | `volumes` |
| `port` | `ports` |
| `env-file` | `env_file` |
| `restart_policy` (service level) | `restart` (or `deploy.restart_policy`) |
| `container-name` | `container_name` |

## Cause 2: wrong indentation moves a key to the wrong level

```yaml
services:
  web:
    image: nginx
  ports:            # wrong: now 'ports' looks like a service named 'ports'
    - "80:80"
```

That gives `services.ports Additional property ...` or a different validation error. Indent it under the service:

```yaml
services:
  web:
    image: nginx
    ports:
      - "80:80"
```

Use spaces, never tabs. A key like `services.web.build Additional property dockerfile ...` usually means the key is fine but got attached to the wrong parent — compare with the documented structure.

## Cause 3: key belongs under a different section

Examples:

```yaml
# Wrong: networks definition inside the service
services:
  api:
    image: api
    networks:
      backend:
        driver: bridge      # 'driver' is not allowed here

# Right: define at top level, reference from the service
services:
  api:
    image: api
    networks: [backend]
networks:
  backend:
    driver: bridge
```

Similarly `memory`, `cpus` limits go under `deploy.resources.limits` (or use the service-level `mem_limit`, `cpus`), and build options like `dockerfile`, `args`, `target` belong under `build:`.

## Cause 4: custom top-level keys

YAML anchors are often defined in a dummy top-level key. Compose only allows custom keys that start with `x-`:

```yaml
x-common-env: &common-env      # must start with x-
  TZ: UTC
  LOG_LEVEL: info

services:
  api:
    environment: *common-env
```

A key like `common:` at top level gives `(root) Additional property common is not allowed`.

## Cause 5: key is too new or too old for your Compose version

Newer keys (`develop`, `include`, `models`, `gw_priority`, ...) are rejected by older Compose releases, and the old v1-only syntax may be rejected by v2. Check your version and upgrade if needed:

```bash
docker compose version
```

If you're still using the standalone `docker-compose` v1 (Python), switch to the `docker compose` plugin. The top-level `version:` key is obsolete — it no longer selects a schema.
