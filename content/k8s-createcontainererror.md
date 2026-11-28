---
error: "CreateContainerError"
error_full: |
  NAME                     READY   STATUS                 RESTARTS   AGE
  api-7d9f8c6b5d-x2kqp     0/1     CreateContainerError   0          2m
cat: kubernetes
description: "The kubelet pulled the image and prepared the config, but the container runtime (containerd / CRI-O) failed to create the container. The real reason is in the pod events: usually no command in the image, a bad volume mount, or a runtime/node problem."
tldr: "Run `kubectl describe pod POD -n NS` and read the `Failed` event under Events. Fix what it names: set `command:` if the image has no CMD/ENTRYPOINT, correct `volumeMounts` / `subPath` / `hostPath` paths, or cordon and investigate the node (`journalctl -u containerd`, disk space) if the runtime itself is failing."
keywords: kubernetes kubectl pod createcontainererror failed to create container containerd cri-o no command specified subpath volume mount hostpath describe pod events
related: [k8s-createcontainerconfigerror, k8s-crashloopbackoff, k8s-container-is-waiting-to-start]
---
## What it means

Pod startup goes: schedule → pull image → build the container config → **create container** → start it. `CreateContainerError` means the create step failed in the runtime. It is different from:

- `CreateContainerConfigError`: Kubernetes couldn't build the config (missing ConfigMap/Secret key, bad env reference).
- `CrashLoopBackOff`: the container started and then exited.

The status alone never tells you why. Get the event message:

```bash
kubectl describe pod api-7d9f8c6b5d-x2kqp -n prod
# Events:
#   Warning  Failed  kubelet  Error: failed to generate container "..." spec: ...
kubectl get events -n prod --sort-by=.lastTimestamp | tail -20
```

## Cause 1: no command specified

If the image defines neither `ENTRYPOINT` nor `CMD` and the pod spec gives no `command`, the runtime has nothing to run and reports `no command specified`. Check the image:

```bash
docker image inspect myimage:tag --format '{{.Config.Entrypoint}} {{.Config.Cmd}}'
```

Fix the Dockerfile (`CMD ["node", "server.js"]`) or set it in the manifest:

```yaml
containers:
  - name: api
    image: myimage:tag
    command: ["node"]
    args: ["server.js"]
```

## Cause 2: the command doesn't exist in the image

A `command:` that points to a binary missing from the image (typo, wrong path, a shell like `/bin/bash` in an Alpine or distroless image) fails with `executable file not found in $PATH`. Depending on the runtime this appears as `CreateContainerError`, `RunContainerError` or `StartError`. Use the exact path that exists in the image, or `sh` instead of `bash` on Alpine.

## Cause 3: volume mount problems

The runtime creates mounts while creating the container, so mount mistakes surface here:

- `subPath` pointing to something that doesn't exist or is the wrong type (mounting a file onto a path that is a directory in the image, or the reverse, gives `not a directory` / `is a directory`).
- `hostPath` with `type: Directory` or `type: File` where that path is missing on the node.
- The same `mountPath` used twice in one container.

```yaml
volumeMounts:
  - name: config
    mountPath: /app/config.yaml   # a file path
    subPath: config.yaml          # key must exist in the ConfigMap
```

Compare the paths in the event message against your `volumeMounts` and `volumes`.

## Cause 4: node or runtime trouble

If many unrelated pods on one node show `CreateContainerError` (messages like `context deadline exceeded`, `failed to reserve container name`, or storage errors), the problem is the node:

```bash
kubectl get pods -A -o wide --field-selector spec.nodeName=NODE
kubectl cordon NODE
# on the node:
df -h /var/lib/containerd /var/lib/kubelet
journalctl -u containerd -u kubelet --since "30 min ago"
```

Full disks, an overloaded runtime and leftover containers after a crash are common. Free space or restart the runtime, then `kubectl uncordon NODE`; deleting the stuck pod lets its controller recreate it.

## Cause 5: security settings the image can't satisfy

`runAsNonRoot: true` with an image whose user is root (or numeric UID not set) is refused, and is reported as `CreateContainerConfigError` on most clusters. Seccomp/AppArmor profiles that don't exist on the node also block container creation. Read the event text: it names the profile or setting.
