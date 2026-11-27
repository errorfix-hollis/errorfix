---
error: "docker: invalid reference format"
error_full: |
  docker: invalid reference format.
  See 'docker run --help'.
cat: docker
description: "Docker could not parse the image name. Usually there are uppercase letters, a space or stray character in the image reference, an empty variable, or the arguments are in the wrong order so an option is being read as the image."
tldr: "Make the image name lowercase and free of spaces (`myapp:latest`, not `MyApp:latest`). Quote paths containing spaces in `-v \"$(pwd)\":/app`, check for empty variables (`echo \"$TAG\"`), and put all options before the image name: `docker run -p 8080:80 nginx`."
keywords: docker invalid reference format repository name must be lowercase docker run docker build -t image name tag uppercase spaces pwd volume windows empty variable
related: [docker-pull-access-denied-repository-does-not-exist, docker-manifest-unknown, docker-oci-runtime-create-failed-executable-file-not-found]
---
## What it means

An image reference has the form `[registry[:port]/]name[:tag][@digest]`. Docker validates it before doing anything else. Rules:

- The name part must be **lowercase**: letters, digits, and separators `.`, `_`, `__`, `-`, `/`.
- A tag can contain letters (upper or lower), digits, `_`, `.`, `-`, up to 128 characters, and can't start with `.` or `-`.
- No spaces, no empty parts (`myapp:` or `:latest`).

A variant, `invalid reference format: repository name must be lowercase`, tells you exactly which rule you broke.

Print the exact command to see what Docker receives:

```bash
set -x
docker run ...
set +x
```

## Cause 1: uppercase letters in the name

```bash
docker build -t MyApp .          # invalid
docker build -t myapp .          # OK
docker build -t myapp:V1.2 .     # OK — uppercase is allowed in the tag
```

In scripts, lower-case a variable with `${NAME,,}` (bash) or `tr '[:upper:]' '[:lower:]'`. GitHub Actions: `${{ github.repository }}` can contain uppercase owners — lowercase it before using it as an image name.

## Cause 2: a path with spaces in -v

`$(pwd)` expands to a path like `/home/me/My Projects/app`; the part after the space becomes the image name.

```bash
docker run -v $(pwd):/app node:20        # breaks with spaces
docker run -v "$(pwd)":/app node:20      # OK
```

On Windows: PowerShell uses `${PWD}` (`-v "${PWD}:/app"`), cmd.exe uses `%cd%` (`-v "%cd%":/app`). `$(pwd)` doesn't work in cmd.

## Cause 3: options after the image name, or a missing value

Everything after the image is passed to the container. If an option is missing its value, the next word shifts into the image position:

```bash
docker run -p 8080:80 -e NODE_ENV=production myapp     # OK
docker run -p -e NODE_ENV=production myapp             # -p eats "-e", so NODE_ENV=production becomes the image
```

## Cause 4: an empty or malformed variable

```bash
docker build -t myapp:$TAG .        # TAG empty -> "myapp:" -> invalid
docker push $REGISTRY/myapp         # REGISTRY empty -> "/myapp" -> invalid
```

Check with `echo "[$TAG]"` and use defaults: `myapp:${TAG:-latest}`. Docker Compose behaves the same with `image: ${REGISTRY}/app:${TAG}`; run `docker compose config` to see the expanded values.

## Cause 5: invisible or pasted characters

Copying commands from web pages or Word can bring in non-breaking spaces, en-dashes (`–p` instead of `-p`) or a Windows carriage return (`\r`) at the end of a line in a shell script. Retype the command, or remove CRs with `sed -i 's/\r$//' script.sh`. The [line ending and whitespace inspector](/tools/line-ending-whitespace-inspector/) shows hidden characters.

## Cause 6: `https://` or a trailing slash in the name

Image references don't include a scheme: use `ghcr.io/owner/app:1.0`, not `https://ghcr.io/owner/app:1.0`.
