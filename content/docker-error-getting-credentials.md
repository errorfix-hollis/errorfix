---
error: "error getting credentials - err: exec: \"docker-credential-desktop\": executable file not found in $PATH"
error_full: |
  error getting credentials - err: exec: "docker-credential-desktop": executable file not found in $PATH, out: ``
  failed to solve: error getting credentials - err: exit status 1, out: ``
cat: docker
description: "Docker's config.json tells it to use a credential helper (credsStore) that isn't installed or can't run, so every pull, build or login fails. Fix or remove the credsStore entry in ~/.docker/config.json."
tldr: "Open `~/.docker/config.json` and remove (or fix) the `\"credsStore\": \"desktop\"` line, then run `docker login` again. If the helper should exist, make sure it is on PATH (e.g. `/Applications/Docker.app/Contents/Resources/bin` on macOS) or install `docker-credential-pass`/`secretservice` on Linux."
keywords: docker error getting credentials docker-credential-desktop executable file not found in path credsStore config.json credential helper osxkeychain wsl docker compose pull build failed to solve
related: [docker-unauthorized-authentication-required, docker-cannot-connect-to-the-docker-daemon, docker-failed-to-solve-did-not-complete-successfully]
---
## What it means

Before talking to a registry, Docker reads `~/.docker/config.json`. If it contains `"credsStore": "X"`, Docker runs a program called `docker-credential-X` to get the password. When that program is missing, not on `PATH`, or crashes, you get `error getting credentials`, even for public images.

Look at the file:

```bash
cat ~/.docker/config.json
```

```json
{
  "auths": { "https://index.docker.io/v1/": {} },
  "credsStore": "desktop"
}
```

Helpers you might see: `desktop` (Docker Desktop), `osxkeychain` (macOS), `wincred` (Windows), `pass` / `secretservice` (Linux), `ecr-login`, `gcloud`.

## Cause 1: leftover Docker Desktop config (WSL, uninstalled Desktop, switched to Colima/OrbStack/Docker Engine)

The config still points to `docker-credential-desktop` but that binary is gone. Remove the line:

```bash
cp ~/.docker/config.json ~/.docker/config.json.bak
# remove the credsStore key (needs jq)
jq 'del(.credsStore)' ~/.docker/config.json.bak > ~/.docker/config.json
docker login
```

Or edit by hand and delete the `"credsStore": "desktop"` line (watch the trailing comma; check the result in the [JSON formatter](/tools/json-formatter/)). Without a helper, `docker login` stores a base64-encoded (not encrypted) credential in `config.json` and warns about it. That is fine for a throwaway box; on a workstation prefer a real helper.

In WSL, also check for `"credsStore": "desktop.exe"` — that works only when Docker Desktop's WSL integration is enabled.

## Cause 2: the helper exists but is not on PATH

On macOS this happens with a Docker Desktop install whose CLI tools aren't linked, often in IDEs or shells with a minimal PATH:

```bash
ls /Applications/Docker.app/Contents/Resources/bin/docker-credential-*
export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"
```

Docker Desktop → Settings → Advanced lets you choose System vs User installation of the CLI tools. Re-applying the setting re-creates the symlinks.

## Cause 3: the helper fails (`exit status 1`)

If the helper runs but errors (locked keychain, no D-Bus session over SSH, `pass` not initialised), the message ends with `exit status 1`. Test it directly:

```bash
echo "https://index.docker.io/v1/" | docker-credential-desktop get
```

- macOS over SSH: the keychain is locked; run `security unlock-keychain` or switch to `osxkeychain` in a GUI session.
- Linux `pass`: initialise with `gpg --generate-key` then `pass init <gpg-id>`.
- Headless Linux with `secretservice`: there is no keyring daemon; use `pass` or drop `credsStore`.

## Cause 4: sudo uses a different config

`sudo docker ...` reads `/root/.docker/config.json`. Either fix that file too, or add yourself to the `docker` group so you don't need sudo.

## Cause 5: credHelpers for a specific registry

`"credHelpers": {"123.dkr.ecr.us-east-1.amazonaws.com": "ecr-login"}` needs `docker-credential-ecr-login` installed (`apt install amazon-ecr-credential-helper` or `brew install docker-credential-helper-ecr`). Install it or remove that entry.
