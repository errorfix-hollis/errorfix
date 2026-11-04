---
error: "manifest unknown"
error_full: |
  Error response from daemon: manifest for myimage:latest not found: manifest unknown: manifest unknown
  Error response from daemon: manifest for node:22.99 not found: manifest unknown: manifest unknown
cat: docker
description: The registry exists and you can reach the repository, but the tag (or digest) you asked for doesn't exist there. Usually a missing `latest` tag, a typo in the tag, or an image that was never pushed.
tldr: "Check which tags actually exist (`docker search` won't show them; use the registry UI or `skopeo list-tags docker://docker.io/library/node`) and pull an explicit tag: `docker pull node:22-alpine`. If it's your own image, push the tag first: `docker push myrepo/myimage:1.0`."
keywords: docker manifest unknown manifest for latest not found pull tag does not exist registry push ghcr ecr docker hub
related: [docker-pull-access-denied-repository-does-not-exist, docker-no-matching-manifest, docker-unauthorized-authentication-required]
---
## What it means

When you run `docker pull name:tag`, Docker asks the registry for the *manifest* of that tag. `manifest unknown` means the registry answered "this repository has no manifest with that tag or digest". Authentication and the repository name were fine (otherwise you'd get `pull access denied` or `unauthorized`); the **tag** is the problem.

Don't confuse it with `no matching manifest for linux/arm64`, which means the tag exists but not for your CPU architecture.

## Cause 1: there is no `latest` tag

If you don't specify a tag, Docker uses `:latest`. Many repositories (and most private ones pushed by CI) never publish `latest`:

```bash
docker pull mycompany/api            # implicitly mycompany/api:latest -> manifest unknown
docker pull mycompany/api:1.4.2      # works
```

## Fix 1: list the tags that exist

For Docker Hub, look at the "Tags" tab on hub.docker.com, or query the registry:

```bash
# skopeo works with any registry
skopeo list-tags docker://docker.io/library/python

# Docker Hub API
curl -s "https://hub.docker.com/v2/repositories/library/python/tags?page_size=50" | jq -r '.results[].name'

# GitHub Container Registry / others (needs auth for private images)
skopeo list-tags docker://ghcr.io/OWNER/IMAGE
```

For AWS ECR:

```bash
aws ecr describe-images --repository-name my-repo --query 'imageDetails[].imageTags' --output text
```

## Cause 2: typo or a tag that was removed

Tags like `node:16-buster` or `python:3.7-slim-stretch` are eventually deleted when the base OS reaches end of life, and old `docker-compose.yml` files break. Also check for typos such as `alpine3.18` vs `alpine:3.18`.

## Fix 2: choose a current tag

Update the `FROM` line or compose file to a tag that's listed:

```dockerfile
FROM node:22-bookworm-slim
```

Pinning an exact version (`postgres:16.4`) is safer than floating tags, but make sure it exists.

## Cause 3: your own image was never pushed (or pushed under another name)

A build that tagged `myapp:dev` locally doesn't make it available in the registry. Check what you pushed:

```bash
docker images myrepo/myapp
docker tag myapp:dev myrepo/myapp:dev
docker push myrepo/myapp:dev
```

In CI, verify the push step ran and used the same registry host, namespace and tag variable as the deploy step (e.g. `$GITHUB_SHA` vs a short SHA).

## Cause 4: pulling by a digest that no longer exists

`image@sha256:...` fails with `manifest unknown` if the registry garbage-collected that digest (common with ECR lifecycle policies or GHCR untagged-version cleanup). Re-pull by tag and update the pinned digest:

```bash
docker pull myrepo/myapp:1.4.2
docker inspect --format '{{index .RepoDigests 0}}' myrepo/myapp:1.4.2
```

## Cause 5: wrong registry or mirror

If a registry mirror (`registry-mirrors` in `/etc/docker/daemon.json`) or a proxy like Harbor/Nexus doesn't have the tag cached, it can return `manifest unknown`. Try the full upstream name, e.g. `docker pull docker.io/library/redis:7`, or check the mirror's configuration.
