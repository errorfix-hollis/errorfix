---
error: "0/3 nodes are available: 3 node(s) had untolerated taint"
error_full: |
  Warning  FailedScheduling  default-scheduler  0/3 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 node(s) had untolerated taint {node.kubernetes.io/not-ready: }. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.
cat: kubernetes
description: "The pod stays Pending because every node carries a taint the pod doesn't tolerate. The taint in braces tells you why: control-plane nodes, nodes that are NotReady/unreachable/under pressure, or custom taints like dedicated=gpu."
tldr: "Read the taint in `{...}`. `control-plane` on a single-node cluster → `kubectl taint nodes --all node-role.kubernetes.io/control-plane-`. `not-ready`/`unreachable` → fix the node (`kubectl describe node`, CNI, kubelet). Custom taints → add a matching `tolerations:` entry to the pod spec, or remove the taint with `kubectl taint nodes <node> key=value:NoSchedule-`."
keywords: kubernetes 0 nodes are available node(s) had untolerated taint FailedScheduling pending control-plane master not-ready unreachable disk-pressure tolerations kubectl taint nodes NoSchedule minikube kubeadm
related: [k8s-0-nodes-are-available-insufficient-cpu, k8s-pod-has-unbound-immediate-persistentvolumeclaims, k8s-container-is-waiting-to-start]
---
## What it means

A taint on a node repels pods unless the pod has a matching toleration. The scheduler checked every node and each one has at least one `NoSchedule` (or `NoExecute`) taint your pod doesn't tolerate, so the pod stays `Pending`.

Older Kubernetes versions phrase it as `node(s) had taint {...}, that the pod didn't tolerate`.

List the taints:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
kubectl describe node <node> | grep -A3 Taints
```

## Cause 1: control-plane taint on a single-node / small cluster

kubeadm taints control-plane nodes with `node-role.kubernetes.io/control-plane:NoSchedule` (older: `node-role.kubernetes.io/master`). With no worker nodes, nothing can run.

For a lab or single-node cluster, remove it:

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
# older clusters
kubectl taint nodes --all node-role.kubernetes.io/master-
```

The trailing `-` removes the taint. In production, add worker nodes instead.

## Cause 2: `node.kubernetes.io/not-ready` or `unreachable`

Kubernetes adds these automatically when a node is unhealthy. The fix is the node, not the pod:

```bash
kubectl get nodes
kubectl describe node <node>          # Conditions, Events
journalctl -u kubelet -n 100          # on the node
```

A very common cause on fresh kubeadm clusters is a missing CNI plugin: the node stays `NotReady` until you install one (Calico, Flannel, Cilium). Other causes: kubelet stopped, expired certificates, node out of disk.

## Cause 3: resource pressure taints

`node.kubernetes.io/disk-pressure`, `memory-pressure`, `pid-pressure`: the kubelet is short of resources.

```bash
df -h /var/lib/kubelet /var/lib/containerd
crictl rmi --prune                    # remove unused images on the node
```

Free space or memory and the taint is removed automatically.

## Cause 4: custom taints (dedicated nodes)

Clusters often reserve nodes, e.g. `dedicated=gpu:NoSchedule` or managed node pools with taints (`CriticalAddonsOnly`, spot instances). Either tolerate the taint in your pod template:

```yaml
spec:
  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
  nodeSelector:
    dedicated: gpu        # also pin it there, tolerations alone don't attract pods
```

or remove the taint if it was added by mistake:

```bash
kubectl taint nodes <node> dedicated=gpu:NoSchedule-
```

For a Deployment, the tolerations go under `spec.template.spec`. Helm charts usually expose a `tolerations:` value.

## Cause 5: `node.kubernetes.io/unschedulable`

The node was cordoned (`kubectl cordon` or a drain during an upgrade). Bring it back:

```bash
kubectl uncordon <node>
```

## Cause 6: combined with other reasons

The message can list several reasons, e.g. `1 node(s) had untolerated taint ..., 2 Insufficient memory`. Fix each group: the taint on one node and resources on the others. Check pod events with `kubectl describe pod <pod>`.
