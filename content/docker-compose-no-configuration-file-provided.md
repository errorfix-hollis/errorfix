---
error: "no configuration file provided: not found"
error_full: |
  $ docker compose up
  no configuration file provided: not found
cat: docker
description: "Docker Compose could not find a compose file in the current directory or any parent directory. You are in the wrong folder, the file has a non-standard name, or it was saved with a hidden extra extension."
tldr: "`cd` into the folder that contains `compose.yaml` / `docker-compose.yml`, or point Compose at the file with `docker compose -f path/to/file.yml up`. Rename non-standard files (e.g. `docker-compose.yml.txt`) to one of `compose.yaml`, `compose.yml`, `docker-compose.yaml`, `docker-compose.yml`."
keywords: docker compose no configuration file provided not found docker-compose.yml compose.yaml -f COMPOSE_FILE wrong directory up down
related: [docker-compose-command-not-found, docker-failed-to-read-dockerfile, docker-compose-version-is-obsolete]
---
## What it means

Compose v2 (`docker compose`) looks for these file names, in this order of preference, in the working directory and then each parent directory:

- `compose.yaml`
- `compose.yml`
- `docker-compose.yaml`
- `docker-compose.yml`

If none exists, every command that needs a project (`up`, `down`, `ps`, `logs`, `build`...) fails with `no configuration file provided: not found`.

## Cause 1: running it from the wrong directory

Check where you are and what's there:

```bash
pwd
ls -a
```

Then `cd` to the project folder, or pass the file explicitly:

```bash
docker compose -f ~/projects/app/docker-compose.yml up -d
```

With `-f`, the project directory defaults to the folder of the first file, so relative paths in it (`build: .`, `./data:/data`) still resolve correctly.

## Cause 2: the file has a different name

Compose does not pick up `docker-compose.dev.yml`, `stack.yml` or `Docker-Compose.yml` (on case-sensitive filesystems) automatically. Either rename it or pass it with `-f`. Several files can be combined:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Or set it once per shell / in a `.env` file next to where you run the command:

```bash
export COMPOSE_FILE=docker-compose.dev.yml
```

## Cause 3: hidden extension on Windows

Windows Explorer hides known extensions, so a file you saved as `docker-compose.yml` in Notepad may actually be `docker-compose.yml.txt`. Check in a terminal:

```powershell
dir
```

and rename it:

```powershell
ren docker-compose.yml.txt docker-compose.yml
```

## Cause 4: wrong directory inside scripts, CI or cron

Scripts and cron jobs often run from `$HOME` or `/`, not from the project. `cd` first or use `-f` with an absolute path:

```bash
cd /srv/app && docker compose pull && docker compose up -d
```

In CI, make sure the checkout step ran and that the job's working directory is the repo root (or the subfolder holding the compose file).

## Cause 5: you only have a Dockerfile

A `Dockerfile` is not a compose file. Either build and run the image directly:

```bash
docker build -t myapp .
docker run -p 8080:8080 myapp
```

or create a minimal `compose.yaml`:

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
```

## Check the file is valid

Once Compose finds the file, `docker compose config` prints the merged, resolved configuration, which is a quick way to confirm which file is used and that the YAML parses. For indentation problems use the [YAML validator](/tools/yaml-validator/).
