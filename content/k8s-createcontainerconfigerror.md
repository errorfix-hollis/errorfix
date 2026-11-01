---
error: "CreateContainerConfigError"
error_full: |
  NAME                     READY   STATUS                       RESTARTS   AGE
  api-7d9f8c6b5-x2kq4      0/1     CreateContainerConfigError   0          45s

  Warning  Failed  kubelet  Error: secret "db-credentials" not found
  Warning  Failed  kubelet  Error: couldn't find key password in Secret default/db-credentials
  Warning  Failed  kubelet  Error: container has runAsNonRoot and image will run as root
cat: kubernetes
description: The image pulled fine, but the kubelet couldn't build the container's configuration. Almost always a ConfigMap or Secret (or a key inside one) referenced by env/envFrom doesn't exist in the pod's namespace, or a securityContext rule can't be satisfied.
tldr: "Run `kubectl describe pod <pod>` and read the Events at the bottom. Create the missing Secret/ConfigMap in the same namespace (`kubectl create secret generic db-credentials --from-literal=password=... -n <ns>`), fix the key name, or mark the reference `optional: true`. For `runAsNonRoot` errors set `runAsUser` to a non-zero UID or use a non-root image."
keywords: kubernetes createcontainerconfigerror pod status secret not found configmap not found couldn't find key runasnonroot image will run as root kubectl describe pod env valuefrom secretkeyref
related: [k8s-crashloopbackoff, k8s-imagepullbackoff, k8s-error-from-server-forbidden]
---
## What it means

Before starting a container, the kubelet assembles its config: environment variables from `env`/`envFrom`, ConfigMap and Secret values, security settings. If any of that fails, the container is never created and the pod sits in `CreateContainerConfigError` (the kubelet keeps retrying, so it fixes itself once the missing object appears).

The exact reason is in the events:

```bash
kubectl describe pod <pod-name> -n <namespace>
# or just the events
kubectl get events -n <namespace> --field-selector involvedObject.name=<pod-name>
```

## Cause 1: Secret or ConfigMap not found

`Error: secret "db-credentials" not found` / `configmap "app-config" not found`.

Secrets and ConfigMaps are namespaced; the pod can only use ones in its **own** namespace.

```bash
kubectl get secret,configmap -n <namespace>
```

Create it in the right namespace:

```bash
kubectl create secret generic db-credentials \
  --from-literal=username=app --from-literal=password='s3cret' -n <namespace>

kubectl create configmap app-config --from-env-file=app.env -n <namespace>
```

If it's created by Helm, a SealedSecret/ExternalSecret operator or a CI step, check that resource (`kubectl get externalsecret -n <ns>`, `kubectl describe sealedsecret ...`) - the operator may have failed to produce it.

## Cause 2: the key doesn't exist in the Secret/ConfigMap

`Error: couldn't find key password in Secret default/db-credentials`.

Compare the keys the pod asks for with the keys that exist:

```bash
kubectl get secret db-credentials -n default -o jsonpath='{.data}'; echo
```

```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: password        # must match a key under data:
```

Keys are case-sensitive; `--from-file=./password.txt` creates a key named `password.txt`, not `password`.

## Cause 3: it's genuinely optional

If the app runs fine without it, mark the reference optional so a missing object doesn't block startup:

```yaml
envFrom:
  - configMapRef:
      name: app-config
      optional: true
env:
  - name: SENTRY_DSN
    valueFrom:
      secretKeyRef:
        name: sentry
        key: dsn
        optional: true
```

## Cause 4: runAsNonRoot with a root image

`Error: container has runAsNonRoot and image will run as root` means the pod (or a Pod Security admission policy) requires non-root, but the image's default user is root (UID 0) or a non-numeric username the kubelet can't verify.

Set a numeric non-root user:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  runAsGroup: 10001
```

Or build the image with `USER 10001` (numeric). Make sure the app can still write where it needs to (mount an `emptyDir` for writable paths).

## Cause 5: other config problems

Less common messages in the same state:

- `failed to prepare subPath for volumeMount` - a `subPath` points at something that doesn't exist or can't be created.
- invalid environment variable references or a malformed `fieldRef`.

## After fixing

The kubelet retries automatically. To speed it up, restart the rollout:

```bash
kubectl rollout restart deployment/<name> -n <namespace>
kubectl get pods -n <namespace> -w
```
