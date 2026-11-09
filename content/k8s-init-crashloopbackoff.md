---
error: "Init:CrashLoopBackOff"
error_full: |
  NAME                     READY   STATUS                  RESTARTS      AGE
  web-6d4cf56db6-x7k2p     0/1     Init:CrashLoopBackOff   5 (40s ago)   4m
cat: kubernetes
description: "One of the pod's init containers keeps exiting with a non-zero code, so Kubernetes restarts it with back-off and the main containers never start."
tldr: "Find the failing init container with `kubectl describe pod <pod>` (Init Containers section, Last State / Exit Code), then read its logs: `kubectl logs <pod> -c <init-container> --previous`. Fix the command, dependency or config it is waiting for."
keywords: kubernetes init:crashloopbackoff init container failing kubectl logs -c init container exit code init:error init:0/1 wait-for service pod stuck
related: [k8s-crashloopbackoff, k8s-createcontainerconfigerror, k8s-imagepullbackoff]
---
## What it means

Init containers run **in order, before** the app containers, and each must exit with code 0. When one fails, the kubelet restarts it (for `restartPolicy: Always`/`OnFailure`) with increasing back-off — that's `Init:CrashLoopBackOff`. You may see it alternate with `Init:Error`. `Init:0/2` means none of two init containers has finished yet.

Because the app container never started, `kubectl logs <pod>` shows nothing useful. You must ask for the init container's logs.

## Step 1: find which init container fails

```bash
kubectl describe pod <pod>
```

Look under **Init Containers** for the one with `State: Waiting, Reason: CrashLoopBackOff` and check `Last State: Terminated`, `Exit Code` and `Reason`.

List the names quickly:

```bash
kubectl get pod <pod> -o jsonpath='{.spec.initContainers[*].name}'
```

## Step 2: read its logs

```bash
kubectl logs <pod> -c <init-container>
kubectl logs <pod> -c <init-container> --previous    # the last crashed run
```

## Cause 1: waiting for a dependency that isn't there

A typical init container waits for a database or service:

```yaml
initContainers:
  - name: wait-for-db
    image: busybox:1.36
    command: ['sh', '-c', 'until nc -z postgres 5432; do echo waiting; sleep 2; done']
```

A loop like this hangs (`Init:0/1`) rather than crashes. If it has a timeout or uses a tool that exits non-zero, it crashes instead. Check that the Service name, namespace and port are right:

```bash
kubectl get svc -n <namespace>
kubectl get endpoints postgres -n <namespace>   # empty = no ready pods behind it
```

Use the full DNS name across namespaces: `postgres.db.svc.cluster.local`.

## Cause 2: migrations or setup scripts fail

Init containers often run `migrate`, `alembic upgrade head`, `prisma migrate deploy` or similar. The logs show the real error — usually bad credentials, a missing Secret value, or a failing migration. Fix the migration or the env vars, then the pod recovers on its own next retry.

## Cause 3: wrong command or missing binary

Exit code `127` = command not found, `126` = not executable. Common with minimal images (`distroless`, `scratch`) that have no shell, so `sh -c` fails. Use an image that contains the tools you call.

## Cause 4: permissions on shared volumes

Init containers that `chown`/`chmod` or copy files into an `emptyDir` fail with "Permission denied" (exit 1) when the pod's `securityContext` sets `runAsNonRoot` or a `runAsUser`. Either run that init container as root explicitly, or use `fsGroup`:

```yaml
securityContext:
  fsGroup: 1000
```

## Cause 5: killed for memory

`Reason: OOMKilled` (exit 137) means the init container's memory limit is too low. Init containers have their own `resources` — raise `limits.memory` on them. See [OOMKilled](/kubernetes/k8s-oomkilled/).

## Debugging interactively

Run the same image and command by hand:

```bash
kubectl run debug --rm -it --image=busybox:1.36 --restart=Never -- sh
# then run the init command and see what happens
```

After you change the Deployment, a new pod is created; delete a stuck one with `kubectl delete pod <pod>` if you only changed an external dependency.
