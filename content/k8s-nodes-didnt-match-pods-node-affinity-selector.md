---
error: "0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector."
error_full: |
  Warning  FailedScheduling  default-scheduler  0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.
cat: kubernetes
description: "The pod has a nodeSelector or required nodeAffinity rule that no node satisfies, usually because the label it asks for doesn't exist on any node, has a typo, or the matching node pool is scaled to zero."
tldr: "Compare the pod's rules with node labels: `kubectl get pod POD -o jsonpath='{.spec.nodeSelector}{.spec.affinity}'` and `kubectl get nodes --show-labels`. Then either label a node (`kubectl label node NODE disktype=ssd`), fix the selector in the Deployment, or switch to `preferredDuringSchedulingIgnoredDuringExecution`."
keywords: kubernetes 0 nodes are available didn't match pod's node affinity selector nodeselector nodeaffinity failedscheduling pending kubectl label node node pool arch amd64 arm64
related: [k8s-nodes-had-untolerated-taint, k8s-0-nodes-are-available-insufficient-cpu, k8s-volume-node-affinity-conflict]
---
## What it means

The scheduler filtered every node and none passed the pod's **node selection rules**, so the pod stays `Pending`. The rules come from one of:

- `spec.nodeSelector` (exact label match)
- `spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution`

Rules under `preferredDuringScheduling...` never cause this error; they're only preferences.

The message can be combined with others, e.g. `1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 node(s) didn't match Pod's node affinity/selector`. Each node is counted under the first filter it failed.

If the message is `volume node affinity conflict`, that's a different problem: the PersistentVolume is pinned to another zone (see [volume node affinity conflict](/kubernetes/k8s-volume-node-affinity-conflict/)).

## Step 1: see what the pod is asking for

```bash
kubectl get pod POD -o yaml | grep -A15 -E 'nodeSelector|nodeAffinity'
kubectl describe pod POD | sed -n '/Node-Selectors/,/Tolerations/p'
```

## Step 2: see what labels the nodes have

```bash
kubectl get nodes --show-labels
kubectl get nodes -L disktype,kubernetes.io/arch,topology.kubernetes.io/zone
```

## Cause 1: label doesn't exist on any node

```yaml
nodeSelector:
  disktype: ssd
```

but no node has `disktype=ssd`.

## Fix 1: label a node, or change the selector

```bash
kubectl label node worker-1 disktype=ssd
```

Labels added by hand are lost if the node is recreated; on managed clusters set them on the node pool instead (EKS node group labels, GKE `--node-labels`, AKS `--labels`).

Or remove/fix the selector in the Deployment:

```bash
kubectl edit deployment myapp
# or
kubectl patch deployment myapp --type=json -p='[{"op":"remove","path":"/spec/template/spec/nodeSelector"}]'
```

## Cause 2: typo or wrong value

Label keys and values are case-sensitive: `Disktype` ≠ `disktype`, `SSD` ≠ `ssd`. Deprecated labels like `beta.kubernetes.io/arch` may not exist on new nodes; use `kubernetes.io/arch`, `kubernetes.io/os`, `topology.kubernetes.io/zone`, `node.kubernetes.io/instance-type`.

## Cause 3: architecture or OS mismatch

Helm charts often require `kubernetes.io/arch: amd64` or `kubernetes.io/os: linux`. On an all-arm64 cluster (Graviton, Apple Silicon kind/minikube) or with Windows-only nodes, nothing matches. Override in the chart values, and make sure the image is multi-arch, or the pod will start and then crash with `exec format error`.

## Cause 4: matching node pool is scaled to zero or gone

The node with the right label was deleted, cordoned for an upgrade, or its pool scaled down. If the cluster autoscaler can't create a node that would match (labels not declared on the node group template), the pod stays Pending. Check autoscaler events:

```bash
kubectl get events --field-selector reason=NotTriggerScaleUp
```

## Cause 5: affinity rule logic

`nodeSelectorTerms` are **ORed**; `matchExpressions` inside one term are **ANDed**. Putting two expressions in one term when you meant either/or makes it unsatisfiable:

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: topology.kubernetes.io/zone
          operator: In
          values: [eu-west-1a, eu-west-1b]   # OR within values
```

## Fix: make it a preference if it isn't a hard requirement

```yaml
preferredDuringSchedulingIgnoredDuringExecution:
- weight: 100
  preference:
    matchExpressions:
    - key: disktype
      operator: In
      values: [ssd]
```

After any fix, the Pending pod is rescheduled automatically; for Deployments, the new ReplicaSet's pods replace it.
