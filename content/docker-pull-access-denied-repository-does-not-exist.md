---
error: "pull access denied for X, repository does not exist or may require 'docker login'"
error_full: |
  Unable to find image 'myapp:latest' locally
  docker: Error response from daemon: pull access denied for myapp, repository does not exist or may require 'docker login': denied: requested access to the resource is denied.
cat: docker
description: Docker tried to pull the image from a registry and was refused. Usually the image name is wrong or was never built locally, it lives in a private repository you haven't logged in to, or the registry/namespace prefix is missing.
tldr: "Check the name with `docker images` — if it's a local image, build it first (`docker build -t myapp .`) and use the exact same tag. For private images run `docker login` (or `docker login ghcr.io`, `aws ecr get-login-password | docker login ...`) and use the full name `registry/namespace/image:tag`."
keywords: docker pull access denied repository does not exist may require docker login requested access to the resource is denied private image docker hub ghcr ecr compose build image tag
related: [docker-no-matching-manifest, docker-cannot-connect-to-the-docker-daemon, k8s-imagepullbackoff]
---
## What it means

When you `docker run`, `docker pull` or `docker compose up` an image that isn't in the local cache, Docker pulls it from a registry. A name without a registry host (e.g. `myapp`) means Docker Hub, `docker.io/library/myapp`. The registry answered "denied", and for security it gives the same answer whether the repository **doesn't exist** or **exists but you can't access it**.

## Fix 1: the image only exists locally (or not at all)

If you meant your own image, it must be built with exactly that name and tag:

```bash
docker images | grep myapp
docker build -t myapp:latest .
docker run myapp:latest
```

`myapp`, `myapp:latest` and `myapp:1.0` are different references; `docker run myapp` means `myapp:latest`. A typo (`my-app` vs `myapp`) sends Docker to Docker Hub, where it fails.

### docker compose

If a service has both `image:` and `build:`, Compose builds it. If it only has `image: myapp`, Compose tries to pull. Either add a `build:` section or build first:

```yaml
services:
  web:
    build: .
    image: myapp:latest
```

```bash
docker compose build
docker compose up
```

`docker compose up` without `--build` may also try pulling before building; `docker compose up --build` avoids that.

## Fix 2: typo in a public image name

Official images have no namespace (`nginx`, `postgres`); others need `user/repo`. Check the exact name on hub.docker.com. Examples of wrong names: `mongo-db` (should be `mongo`), `node:lts-alpine3.99` (nonexistent tag gives `manifest unknown` instead).

## Fix 3: private repository — log in

```bash
docker login                       # Docker Hub
docker pull myuser/private-app:1.0
```

Other registries need the host in both the login and the image name:

```bash
# GitHub Container Registry (use a PAT with read:packages)
echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin
docker pull ghcr.io/owner/app:1.0

# AWS ECR
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Google Artifact Registry
gcloud auth configure-docker europe-docker.pkg.dev
```

Check stored credentials in `~/.docker/config.json`. If you ran `sudo docker login` but run `docker` without sudo (or vice versa), the credentials are in a different home directory.

## Fix 4: pushing — wrong namespace

`denied: requested access to the resource is denied` on `docker push` means you're pushing to a namespace you don't own. Tag with your username or org:

```bash
docker tag myapp:latest myuser/myapp:latest
docker push myuser/myapp:latest
```

## Fix 5: Dockerfile `FROM` references a local or private image

`docker build` fails the same way if `FROM mybase:1.0` isn't available locally or in a registry you're logged in to. Build the base image first, or log in. With BuildKit, a local image may not be visible to a `docker-container` builder — use the default builder (`docker buildx use default`) or push the base to a registry.

## Fix 6: Kubernetes

In a cluster the equivalent is `ErrImagePull` / `ImagePullBackOff`. Create a pull secret and reference it:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io --docker-username=USER --docker-password=TOKEN
```

```yaml
spec:
  imagePullSecrets:
    - name: regcred
```
