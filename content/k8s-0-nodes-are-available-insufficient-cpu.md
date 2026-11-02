---
error: "0/3 nodes are available: Insufficient cpu"
error_full: |
  Warning  FailedScheduling  default-scheduler  0/3 nodes are available: 3 Insufficient cpu. preemption: 0/3 nodes are available: 3 No preemption victims found for incoming pod.
  0/3 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 Insufficient memory.
cat: kubernetes
description: The scheduler cannot place the pod on any node because no node has enough unreserved CPU (or memory) to satisfy the pod's resource requests. Requests count, not actual usage.
tldr: "Run `kubectl describe pod POD` and `kubectl describe nodes | grep -A8 \"Allocated resources\"`. Lower `resources.requests.cpu` (e.g. `100m` instead of `2`), reduce replicas, remove stuck/unused pods, or add nodes / enable the cluster autoscaler."
keywords: kubernetes 0/3 nodes are available insufficient cpu insufficient memory pending pod failedscheduling resource requests limits allocatable autoscaler taint preemption
related: [k8s-oomkilled, k8s-crashloopbackoff, k8s-pod-has-unbound-immediate-persistentvolumeclaims]
---
## What it means

The pod stays `Pending`. For each node, the scheduler checks whether **allocatable CPU minus the sum of CPU requests of pods already on that node** is at least this pod's CPU request. No node passed, so it reports `N Insufficient cpu`. A node can be at 5% real CPU usage and still be "full" if its pods *request* a lot.

The message lists a reason for every node, so read it all: `1 node(s) had untolerated taint`, `2 Insufficient memory`, `didn't match Pod's node affinity/selector` are separate problems.

## Diagnose

```bash
kubectl describe pod my-pod             # Events: FailedScheduling
kubectl get pod my-pod -o jsonpath='{.spec.containers[*].resources}'
kubectl describe nodes | grep -A 8 "Allocated resources"
kubectl top nodes                        # real usage (needs metrics-server)
```

`Allocated resources` shows, per node, e.g. `cpu 3800m (95%)` requests out of allocatable. If that's near 100%, the node is full for scheduling.

## Fix 1: lower the requests

CPU is measured in cores: `1` = one vCPU, `500m` = half, `100m` = a tenth. A request of `2` on 2-vCPU nodes can never fit, because system components reserve part of each node.

```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    memory: 512Mi
```

Set requests near the pod's typical usage (check `kubectl top pod`). Helm charts often default to large requests — override them in values.

Watch out for a `LimitRange` in the namespace that injects default requests:

```bash
kubectl get limitrange -n my-namespace -o yaml
```

## Fix 2: free capacity

```bash
kubectl get pods -A --field-selector=status.phase!=Running
kubectl get pods -A -o wide | grep NODE_NAME
```

- Scale down unused deployments: `kubectl scale deploy old-app --replicas=0`.
- Delete completed Jobs and evicted pods.
- During rolling updates, `maxSurge` creates extra pods temporarily; with tight capacity use `maxSurge: 0` and `maxUnavailable: 1`.

## Fix 3: add capacity

- Managed clusters: increase the node pool size, or enable the cluster autoscaler (EKS, GKE, AKS) so a Pending pod triggers a new node.
- If the pod's request is bigger than any single node, adding nodes of the same size won't help — use a larger instance type.
- minikube: `minikube start --cpus=4 --memory=8g` (recreate with `minikube delete` first). kind/Docker Desktop: raise Docker's CPU allocation.

## Fix 4: the control-plane taint (single-node / small clusters)

`had untolerated taint {node-role.kubernetes.io/control-plane: }` means the scheduler won't use the control-plane node. On a lab cluster (kubeadm) you can allow workloads there:

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

Don't do that in production.

## Fix 5: selectors and affinity narrow the choice

If the pod has a `nodeSelector`, node affinity or a toleration-only node pool, only those nodes are considered, and they may be the full ones. Check:

```bash
kubectl get pod my-pod -o yaml | grep -A5 -E "nodeSelector|affinity"
kubectl get nodes --show-labels
```

## Fix 6: priority and preemption

`No preemption victims found` means no lower-priority pods could be evicted to make room. For critical workloads, give them a higher `PriorityClass` so the scheduler can preempt less important pods.
