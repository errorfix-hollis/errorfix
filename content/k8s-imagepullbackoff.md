---
error: "ImagePullBackOff / ErrImagePull"
error_full: |
  Failed to pull image "myregistry.io/web:1.4": rpc error: code = NotFound desc = failed to pull and unpack image "myregistry.io/web:1.4": not found
cat: kubernetes
description: The node couldn't download the container image. Wrong name or tag, a private registry without imagePullSecrets, or rate limits.
tldr: "Run `kubectl describe pod <pod>` and read the Events. `not found` → fix the image name/tag. `unauthorized` / `pull access denied` → add `imagePullSecrets`. `toomanyrequests` → Docker Hub rate limit: authenticate or use a mirror."
keywords: imagepullbackoff errimagepull kubernetes failed to pull image not found unauthorized imagepullsecrets docker hub rate limit
related: [k8s-crashloopbackoff, docker-exec-format-error]
---
## What it means

`ErrImagePull` is the first failed pull; `ImagePullBackOff` means Kubernetes keeps retrying with growing delays.

## Step 1: read the exact reason

```bash
kubectl describe pod <pod>
```

The **Events** section shows the registry's message.

## not found / manifest unknown

- Typo in the image name or tag. Tags are case-sensitive.
- The tag was never pushed. Check: `docker manifest inspect myregistry.io/web:1.4`.
- **No image for the node's architecture:** `no match for platform in manifest`. Build a multi-arch image (`docker buildx build --platform linux/amd64,linux/arm64 ... --push`).
- Local images (built with `docker build` on your laptop) aren't visible to the cluster. With kind use `kind load docker-image web:1.4`; with minikube `minikube image load web:1.4`; and set `imagePullPolicy: IfNotPresent`.

## unauthorized / pull access denied / authentication required

The registry is private. Create a pull secret and reference it:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.io --docker-username=USER --docker-password=TOKEN \
  -n <namespace>
```

```yaml
spec:
  imagePullSecrets:
    - name: regcred
```

The secret must be in the **same namespace** as the pod. On EKS/GKE/AKS, managed registries (ECR, Artifact Registry, ACR) are usually authorised through node IAM roles instead; check those permissions.

## toomanyrequests

Docker Hub limits anonymous pulls per IP. Authenticate with a pull secret for `docker.io`, mirror the images to your own registry, or use an alternative such as `public.ecr.aws`.

## Timeouts / i/o timeout

The node can't reach the registry: DNS, firewall, proxy or a missing NAT gateway on private nodes. Test from a node, or with a debug pod running `nslookup` / `wget` against the registry.
