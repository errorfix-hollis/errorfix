---
error: "failed to fetch oauth token"
error_full: |
  ERROR: failed to solve: failed to fetch oauth token: unexpected status from POST request to https://auth.docker.io/token: 401 Unauthorized
  failed to authorize: failed to fetch oauth token: Post "https://auth.docker.io/token": dial tcp: lookup auth.docker.io: no such host
  failed to fetch anonymous token: unexpected status: 401 Unauthorized
cat: docker
description: "BuildKit couldn't get an auth token from the registry while pulling a base image or pushing. Usually stale or wrong credentials in ~/.docker/config.json, an expired token for a private registry, or a network/proxy problem reaching the auth server."
tldr: "Log out and back in: `docker logout` then `docker login` (use a personal access token, not your password, if 2FA is on). For private registries log in to that host, e.g. `aws ecr get-login-password | docker login --username AWS --password-stdin <id>.dkr.ecr.<region>.amazonaws.com`. If it's a network error, fix DNS/proxy, and retry with `DOCKER_BUILDKIT=0` to confirm."
keywords: docker failed to fetch oauth token 401 unauthorized auth.docker.io buildkit failed to solve docker login logout credentials ecr ghcr proxy
related: [docker-unauthorized-authentication-required, docker-error-getting-credentials, docker-pull-access-denied-repository-does-not-exist]
---
## What it means

Docker registries use token auth: before pulling or pushing, the client asks the registry's auth endpoint (for Docker Hub, `https://auth.docker.io/token`) for a bearer token, sending your stored credentials if you have any. BuildKit (the default builder in `docker build` and `docker buildx`) reports a failure of that step as `failed to fetch oauth token`.

The part after it tells you which kind of problem you have:

- `401 Unauthorized` / `403 Forbidden` → credentials problem.
- `dial tcp`, `no such host`, `i/o timeout`, `connection refused` → network/DNS/proxy problem.

## Cause 1: stale or wrong Docker Hub credentials

Docker sends saved credentials even for public images. If they're wrong (changed password, revoked access token, account with 2FA logged in with a password), the token request gets 401 — even though anonymous access would have worked.

## Fix 1: log out, then log in with a valid token

```bash
docker logout
docker build .            # works anonymously for public images?
docker login -u youruser  # paste a personal access token as the password
```

Create the access token at Docker Hub → Account settings → Personal access tokens. Check what's stored:

```bash
cat ~/.docker/config.json
```

If `credsStore` is set (`desktop`, `osxkeychain`, `pass`), the credentials live in that helper; `docker logout` clears them there.

## Cause 2: private registry token expired

ECR tokens expire after 12 hours; GCP and Azure tokens are short-lived as well.

## Fix 2: log in to the right registry host

```bash
# AWS ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.eu-west-1.amazonaws.com

# GitHub Container Registry (PAT with read:packages / write:packages)
echo "$GITHUB_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin

# Google Artifact Registry
gcloud auth configure-docker europe-docker.pkg.dev

# Azure
az acr login --name myregistry
```

The hostname in `docker login` must match the image prefix exactly.

## Cause 3: network, DNS or proxy

`lookup auth.docker.io: no such host` or timeouts mean the build can't reach the auth server. Common with corporate proxies, VPNs, or broken DNS inside Docker Desktop/WSL.

## Fix 3: check connectivity from the host and configure the proxy

```bash
curl -sI https://auth.docker.io/token
nslookup auth.docker.io
```

For a proxy, set it for the daemon (`/etc/systemd/system/docker.service.d/http-proxy.conf` with `Environment="HTTPS_PROXY=http://proxy:3128"`, then `sudo systemctl daemon-reload && sudo systemctl restart docker`) or in Docker Desktop → Settings → Resources → Proxies. Restarting Docker Desktop or `wsl --shutdown` often fixes transient DNS issues.

## Cause 4: buildx builder with its own config

A `docker-container` buildx builder runs in its own container. It uses your client credentials, but not necessarily your daemon's proxy or registry mirror settings.

## Fix 4: test with the default builder

```bash
docker buildx use default
DOCKER_BUILDKIT=0 docker build .   # legacy builder, for comparison
```

If the legacy builder works, recreate the buildx builder with the needed settings (`docker buildx create --driver-opt env.HTTPS_PROXY=...`).

## Cause 5: Docker Hub rate limit or outage

Anonymous pulls are rate-limited; repeated failures can surface as auth errors. Log in to get a higher limit (see [toomanyrequests](/docker/docker-toomanyrequests-pull-rate-limit/)) and check status.docker.com.
