---
error: "CrashLoopBackOff"
error_full: |
  NAME                     READY   STATUS             RESTARTS      AGE
  web-7d9c6b8f5d-x2k4q     0/1     CrashLoopBackOff   5 (32s ago)   4m
cat: kubernetes
description: The container starts, exits, and Kubernetes keeps restarting it with growing delays. The reason is in the previous container's logs and in kubectl describe.
tldr: "Run `kubectl logs <pod> --previous` to see why the last run died, and `kubectl describe pod <pod>` for the exit code and events. Exit code 137 = killed (often OOM), 1 = app error, 127 = command not found."
keywords: crashloopbackoff kubernetes pod restarting kubectl logs previous exit code 137 oomkilled liveness probe
related: [k8s-imagepullbackoff]
---
## What it means

CrashLoopBackOff isn't a cause, it's a state: the container keeps **exiting**, and the kubelet waits longer between restarts each time (10s, 20s, 40s… up to 5 minutes).

## Step 1: logs from the crashed run

```bash
kubectl logs <pod> --previous
kubectl logs <pod> -c <container> --previous   # multi-container pods
```

Without `--previous` you may see the logs of the new, not-yet-crashed container (often empty).

## Step 2: exit code and events

```bash
kubectl describe pod <pod>
```

Look at **Last State: Terminated**, **Reason** and **Exit Code**, and the **Events** at the bottom.

| Exit code / reason | Usual cause |
|---|---|
| `1` / `Error` | The app crashed. Read the logs: missing env var, bad config, can't reach the database… |
| `137` / `OOMKilled` | Out of memory. Raise `resources.limits.memory` or fix the leak |
| `137` without OOMKilled | Killed by a failing liveness probe or by SIGKILL after shutdown timeout |
| `127` | Command in `command:`/`args:` or the entrypoint doesn't exist in the image |
| `126` | Command not executable (permissions) |
| `0` / `Completed` | The process finished. A Deployment expects a long-running process; use a Job for one-off tasks |
| `139` | Segfault in native code |

## Common fixes

**Missing configuration.** Check that referenced ConfigMaps/Secrets exist and env vars are set:

```bash
kubectl get pod <pod> -o yaml | grep -A20 env:
```

**Liveness probe too aggressive.** If the app needs 60 s to start but the probe fails after 10 s, it gets killed forever. Add a `startupProbe`, or raise `initialDelaySeconds` / `failureThreshold`.

**The container exits immediately because there's nothing to run.** Images like `ubuntu` or `alpine` exit at once. For debugging, keep it alive: `command: ["sleep", "infinity"]`.

**Architecture mismatch.** `exec format error` in the logs means an arm64 image on amd64 nodes, or the reverse. See [exec format error](/docker/docker-exec-format-error/).

## Debug inside the container

Override the command so it stays up, then look around:

```bash
kubectl debug <pod> -it --copy-to=debug-pod --container=<container> -- sh
```
