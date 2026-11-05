---
error: "toomanyrequests: You have reached your pull rate limit."
error_full: |
  Error response from daemon: toomanyrequests: You have reached your pull rate limit. You may increase the limit by authenticating and upgrading: https://www.docker.com/increase-rate-limit
cat: docker
description: Docker Hub limits how many image pulls an IP address (anonymous) or account can make in a time window. CI runners and shared NAT IPs hit it quickly. Log in, cache images, or pull from a mirror.
tldr: "Run `docker login` (authenticated pulls get a much higher limit), and add a `docker/login-action` step or `docker login -u $USER --password-stdin` in CI. Stop pulling repeatedly: reuse cached images, use `--pull=missing`, or pull from a mirror such as `mirror.gcr.io/library/<image>` or AWS `public.ecr.aws/docker/library/<image>`."
keywords: docker toomanyrequests you have reached your pull rate limit docker hub rate limit 429 anonymous pulls docker login ci github actions mirror registry-mirrors
related: [docker-unauthorized-authentication-required, docker-pull-access-denied-repository-does-not-exist, k8s-imagepullbackoff]
---
## What it means

Docker Hub returned HTTP 429. Anonymous pulls are limited per IP address, authenticated pulls per account (with higher limits on paid plans). The exact numbers change, so check Docker's current pricing page. Every pull of a manifest counts, even if layers are cached locally, so a CI pipeline that runs `docker pull` many times an hour, or many machines behind one NAT IP, hits the limit fast.

Check your remaining quota (needs `jq`):

```bash
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | jq -r .token)
curl -s --head -H "Authorization: Bearer $TOKEN" \
  https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest | grep -i ratelimit
```

`ratelimit-remaining: 0;w=21600` means none left in the current window (seconds).

## Fix 1: authenticate

```bash
docker login            # Docker Hub username + access token
```

Create an access token at Docker Hub → Account settings → Personal access tokens rather than using your password.

In CI, log in before any `pull`/`build` step. GitHub Actions:

```yaml
- uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}
```

Generic shell:

```bash
echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
```

For Kubernetes, nodes pull anonymously unless you create a pull secret:

```bash
kubectl create secret docker-registry dockerhub \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=USER --docker-password=TOKEN
```

and reference it in `imagePullSecrets` (or attach it to the service account).

## Fix 2: stop pulling the same image repeatedly

- `docker build` re-checks base images if you pass `--pull`; drop it when you don't need the latest base.
- `docker compose up --pull missing` / `docker run --pull=missing` only pull if the image isn't local.
- In Kubernetes, use a pinned tag and `imagePullPolicy: IfNotPresent` instead of `:latest` + `Always`.
- Cache images in CI (e.g. BuildKit cache via `cache-from`/`cache-to`).

## Fix 3: pull from a mirror

Official images are mirrored elsewhere:

```bash
docker pull mirror.gcr.io/library/nginx:1.27
docker pull public.ecr.aws/docker/library/python:3.12-slim
```

Change `FROM` lines accordingly, or configure the daemon to use a pull-through mirror in `/etc/docker/daemon.json`:

```json
{
  "registry-mirrors": ["https://mirror.gcr.io"]
}
```

```bash
sudo systemctl restart docker
```

Validate the file in the [JSON formatter](/tools/json-formatter/) first — a syntax error stops dockerd from starting. `registry-mirrors` only applies to Docker Hub images.

## Fix 4: run your own cache

For teams, a pull-through cache (Docker's `registry:2` with `proxy.remoteurl`, Harbor, Nexus, Artifactory, or your cloud's registry cache) means Docker Hub sees one pull per image instead of one per machine. Authenticate the cache to Docker Hub so its own pulls use an account limit.

## Fix 5: wait

If you just need it working again, the limit resets as the rolling window passes. Check `ratelimit-remaining` as above.
