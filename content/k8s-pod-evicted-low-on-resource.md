---
error: "The node was low on resource: ephemeral-storage"
error_full: |
  Status:   Failed
  Reason:   Evicted
  Message:  The node was low on resource: ephemeral-storage. Threshold quantity: 10Gi, available: 8Gi. Container app was using 12Gi, request is 0, has larger consumption of ephemeral-storage.
  Warning  Evicted  kubelet  The node was low on resource: memory. Container app was using 1500Mi, request is 256Mi, has larger consumption of memory.
cat: kubernetes
description: "The kubelet killed the pod to protect the node because disk (ephemeral-storage, DiskPressure) or memory (MemoryPressure) dropped below an eviction threshold. Free node resources and set requests/limits so the pod stops exceeding them."
tldr: "Find out which resource: `kubectl describe pod <pod>` and `kubectl describe node <node>` (Conditions). For disk, stop writing logs/temp files to the container filesystem, set `resources.requests/limits.ephemeral-storage`, and clean the node (`crictl rmi --prune`). For memory, set realistic memory requests. Delete old evicted pods: `kubectl delete pod --field-selector=status.phase=Failed -A`."
keywords: kubernetes pod evicted the node was low on resource ephemeral-storage memory diskpressure memorypressure kubelet eviction threshold delete evicted pods
related: [k8s-oomkilled, k8s-0-nodes-are-available-insufficient-cpu, k8s-crashloopbackoff]
---
## What it means

The kubelet watches node resources. When free memory, disk (`nodefs`/`imagefs`) or inodes cross an **eviction threshold** (defaults: `memory.available<100Mi`, `nodefs.available<10%`, `imagefs.available<15%`, `nodefs.inodesFree<5%`), it sets a node condition (`MemoryPressure` or `DiskPressure`), adds a taint so new pods aren't scheduled there, and evicts pods until it's healthy again. Pods using the most resource **above their requests** go first.

Evicted pods stay in `Failed` status (they aren't restarted in place); their Deployment/ReplicaSet creates replacements elsewhere.

Unlike [OOMKilled](/kubernetes/k8s-oomkilled/), which is a container exceeding its own memory limit, eviction is about the whole node running short.

## Step 1: which resource and which node

```bash
kubectl get pods -A --field-selector=status.phase=Failed
kubectl describe pod <pod> -n <ns> | grep -A3 -i reason
kubectl describe node <node> | grep -A8 Conditions
kubectl top node; kubectl top pod -A --sort-by=memory
```

## Cause 1: ephemeral-storage / DiskPressure

Ephemeral storage = the container's writable layer + `emptyDir` volumes + container logs. Common culprits: apps writing large logs or temp files to the container filesystem, caches in `emptyDir`, and nodes full of old images.

**Fixes:**

- Log to stdout and let the runtime rotate it, instead of writing files inside the container.
- Put large data on a PersistentVolume, not the container filesystem.
- Bound `emptyDir` volumes: `emptyDir: { sizeLimit: 2Gi }`.
- Declare storage needs so the scheduler accounts for them:

```yaml
resources:
  requests:
    ephemeral-storage: "1Gi"
  limits:
    ephemeral-storage: "4Gi"
```

- Clean the node:

```bash
sudo crictl rmi --prune          # containerd/CRI-O: remove unused images
docker system prune -a           # Docker-based nodes
sudo journalctl --vacuum-size=500M
df -h /var/lib/kubelet /var/lib/containerd
```

On managed clusters, increase the node disk size in the node pool settings.

## Cause 2: MemoryPressure

Pods without memory requests (or with requests far below real usage) are evicted first.

**Fix:** set requests close to real usage and a limit:

```yaml
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "1Gi"
```

Pods where requests equal limits for every container get the `Guaranteed` QoS class and are the last to be evicted. Also add nodes or use larger nodes if the cluster is simply overcommitted.

## Cause 3: PID pressure

`The node was low on resource: pids` means processes are leaking (zombie children, fork bombs). Fix the app, or set `podPidsLimit` in the kubelet config.

## Clean up the evicted pods

They're harmless but clutter output:

```bash
kubectl delete pod -A --field-selector=status.phase=Failed
```

The pod garbage collector only removes them once the cluster has more terminated pods than `--terminated-pod-gc-threshold` (kube-controller-manager, default 12500), so on most clusters they linger.
