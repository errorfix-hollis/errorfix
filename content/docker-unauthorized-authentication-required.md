---
error: "unauthorized: authentication required"
error_full: |
  Error response from daemon: Head "https://registry-1.docker.io/v2/myorg/app/manifests/latest": unauthorized: authentication required
  denied: requested access to the resource is denied
  unauthorized: incorrect username or password
cat: docker
description: The registry rejected your pull or push because you're not logged in, your credentials or token expired, or you're pushing to a repository name your account can't write to.
tldr: "Log in to the right registry: `docker login` (Docker Hub) or `docker login ghcr.io -u USER` with a personal access token. Tag images with your namespace before pushing: `docker tag app myuser/app:1.0 && docker push myuser/app:1.0`. For ECR: `aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com`."
keywords: docker unauthorized authentication required denied requested access to the resource is denied docker login push pull ghcr ecr gcr acr token expired credential helper incorrect username or password
related: [docker-pull-access-denied-repository-does-not-exist, docker-no-matching-manifest, docker-cannot-connect-to-the-docker-daemon]
---
## What it means

The registry returned HTTP 401/403. Docker sent either no credentials or credentials the registry didn't accept for that repository. Common variants:

- `unauthorized: authentication required` — no valid login for this registry
- `denied: requested access to the resource is denied` — logged in, but not allowed to push to that name
- `unauthorized: incorrect username or password` — bad login (often 2FA account using a password instead of a token)

Check who you're logged in as:

```bash
cat ~/.docker/config.json     # "auths" lists registries; "credsStore" = helper in use
docker info | grep -i username
```

## Fix 1: log in to the registry in the image name

Credentials are per registry host, taken from the image name:

| Image | Login command |
|---|---|
| `myuser/app` | `docker login` (Docker Hub) |
| `ghcr.io/org/app` | `docker login ghcr.io -u USER` |
| `registry.gitlab.com/g/p` | `docker login registry.gitlab.com` |
| `123.dkr.ecr.eu-west-1.amazonaws.com/app` | see ECR below |

Use a **personal access token**, not your password, if your account has 2FA or SSO. Docker Hub: Account Settings → Personal access tokens. GitHub: a classic PAT with `write:packages` (and `read:packages`):

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u myuser --password-stdin
```

## Fix 2: tag with your namespace before pushing

```bash
docker push app:1.0                    # tries docker.io/library/app -> denied
docker tag app:1.0 myuser/app:1.0
docker push myuser/app:1.0
```

The first path segment on Docker Hub must be your username or an organization you can push to. For other registries, the full host must be in the tag: `docker tag app ghcr.io/myorg/app:1.0`.

## Fix 3: expired token (ECR, GCR, ACR)

Cloud registry logins expire (ECR tokens last 12 hours). Log in again:

```bash
# AWS ECR
aws ecr get-login-password --region eu-west-1 \
  | docker login --username AWS --password-stdin 123456789012.dkr.ecr.eu-west-1.amazonaws.com

# Google Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev

# Azure
az acr login --name myregistry
```

For ECR, the repository must also exist before you push: `aws ecr create-repository --repository-name app`.

## Fix 4: sudo uses a different config

`docker login` stores credentials in `~/.docker/config.json` of the user who ran it. `sudo docker push` reads `/root/.docker/config.json` instead. Use the same user for both, or add yourself to the `docker` group so you don't need sudo.

## Fix 5: broken credential helper

If `config.json` has `"credsStore": "desktop"` (or `osxkeychain`, `pass`, `secretservice`) and the helper is missing or locked, logins silently fail. Log out and in again:

```bash
docker logout
docker login
```

On a headless Linux box without a keyring, remove the `credsStore` line so credentials are stored in the file.

## Fix 6: private base image in a build

`docker build` pulls `FROM` images with your logged-in credentials; in CI you must log in before building. In GitHub Actions use `docker/login-action`; with BuildKit and a remote builder, the builder needs the credentials too.

## Pulls failing on public images

`unauthorized` on a public image usually means a wrong name (repository doesn't exist and the registry refuses to say so) or a stale/invalid login being sent. Try `docker logout` and pull again anonymously.
