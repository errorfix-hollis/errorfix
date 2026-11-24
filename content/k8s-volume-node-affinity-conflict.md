---
error: "1 node(s) had volume node affinity conflict"
error_full: |
  Warning  FailedScheduling  default-scheduler  0/3 nodes are available: 1 node(s) had volume node affinity conflict, 2 node(s) didn't match Pod's node affinity/selector. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.
cat: kubernetes
description: "The pod's PersistentVolume can only be attached to nodes in a specific zone (or a specific node, for local volumes), and no node in that zone is available for the pod. Typical with EBS, GCE PD and Azure Disk volumes after a node pool change."
tldr: "Find the PV's zone with `kubectl get pv <pv> -o jsonpath='{.spec.nodeAffinity}'` and compare with `kubectl get nodes -L topology.kubernetes.io/zone`. Add or scale up a node in that zone, remove pod nodeSelectors/affinity that exclude it, and use a StorageClass with `volumeBindingMode: WaitForFirstConsumer` so new volumes are created where the pod is scheduled."
keywords: kubernetes volume node affinity conflict failedscheduling persistentvolume zone ebs gce pd azure disk waitforfirstconsumer statefulset topology.kubernetes.io/zone local volume pending pod
related: [k8s-pod-has-unbound-immediate-persistentvolumeclaims, k8s-multi-attach-error-for-volume, k8s-0-nodes-are-available-insufficient-cpu]
---
## What it means

Zonal block storage (AWS EBS, GCE Persistent Disk, Azure Disk) can only be attached to a VM in the same availability zone. Kubernetes records this on the PersistentVolume as `spec.nodeAffinity`. The scheduler must place the pod on a node that matches it. If every matching node is full, cordoned, tainted, excluded by the pod's own `nodeSelector`/affinity, or gone, the pod stays `Pending` with this message.

## Diagnose

```bash
kubectl describe pod <pod> | grep -A5 Events
kubectl get pvc -n <ns>                      # which PV the pod uses
kubectl get pv <pv-name> -o jsonpath='{.spec.nodeAffinity}{"\n"}'
kubectl get nodes -L topology.kubernetes.io/zone
```

Typical output: the PV requires `topology.kubernetes.io/zone in [us-east-1a]`, but your nodes are only in `us-east-1b` and `us-east-1c`.

## Cause 1: no usable node left in the volume's zone

Happens after replacing a node group, an autoscaler scale-down, or spot instances being reclaimed. Fixes:

- Make sure the node group/ASG spans that zone and scale it up. With Cluster Autoscaler on AWS, use one node group **per AZ** for stateful workloads (a multi-AZ ASG cannot target a specific zone when scaling up).
- Check that nodes in that zone are not cordoned or tainted: `kubectl describe node <node> | grep -i -E 'taint|unschedulable'`.
- Check they have enough CPU/memory for the pod.

## Cause 2: the pod's own constraints exclude that zone

The message often comes with `didn't match Pod's node affinity/selector`. A `nodeSelector`, `nodeAffinity`, or topology spread constraint added later can forbid the only zone where the disk lives. Relax it, or include the zone.

## Cause 3: volume created in the wrong zone (Immediate binding)

With `volumeBindingMode: Immediate`, the disk is provisioned as soon as the PVC is created, in some zone, before the scheduler knows where the pod will go. Use delayed binding:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-wffc
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp3
```

`volumeBindingMode` is immutable, so create a new StorageClass and use it for new PVCs. Existing volumes stay in their zone.

## Cause 4: local / hostPath PVs

`local` PersistentVolumes have node affinity to a single node. If that node is deleted or replaced, the data is gone with it; the pod can never schedule. Delete the PVC and PV so a new one is provisioned (data loss), and restore from backup:

```bash
kubectl delete pvc <pvc> -n <ns>
kubectl delete pv <pv>
```

For StatefulSets, delete the pod afterwards so it is recreated with a fresh PVC.

## Moving data to another zone

A zonal disk can't be moved directly. Take a snapshot (`VolumeSnapshot` with the CSI driver, or an EBS/PD snapshot), create a new PVC from it in the target zone, and point the workload at it. For workloads that must survive zone loss, use regional disks (GCE `replication-type: regional-pd`) or replicated storage.
