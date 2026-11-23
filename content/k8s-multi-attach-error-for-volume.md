---
error: "Multi-Attach error for volume: Volume is already exclusively attached to one node and can't be attached to another"
error_full: |
  Warning  FailedAttachVolume  2m  attachdetach-controller  Multi-Attach error for volume "pvc-3f2a9c1e-..." Volume is already exclusively attached to one node and can't be attached to another
  Warning  FailedMount  1m  kubelet  Unable to attach or mount volumes: unmounted volumes=[data], unattached volumes=[data]: timed out waiting for the condition
cat: kubernetes
description: "A ReadWriteOnce volume (EBS, Azure Disk, GCE PD, most block storage) can be attached to only one node at a time. A new pod on a different node is waiting for the volume, which is still attached to the old node."
tldr: "Usually it's a Deployment rolling update: set `strategy: type: Recreate` for single-replica Deployments with an RWO PVC (or use a StatefulSet). If the old node is dead, delete the stuck pod (`kubectl delete pod <old> --grace-period=0 --force`) and, if needed, the stale `VolumeAttachment` (`kubectl get volumeattachment`). For many pods sharing data, use ReadWriteMany storage (EFS, Azure Files, NFS)."
keywords: kubernetes multi-attach error for volume already exclusively attached to one node readwriteonce rwo ebs azure disk pvc deployment rolling update recreate volumeattachment failedattachvolume statefulset readwritemany
related: [k8s-pod-has-unbound-immediate-persistentvolumeclaims, k8s-container-is-waiting-to-start, k8s-crashloopbackoff]
---
## What it means

Block volumes are attached to a node like a disk. With access mode `ReadWriteOnce` (RWO), Kubernetes' attach/detach controller won't attach it to a second node while it's attached to the first. The new pod sits in `ContainerCreating` with `FailedAttachVolume` events until the volume is detached from the old node.

Find where it's attached:

```bash
kubectl describe pod <new-pod>          # events show the PVC name
kubectl get pvc <claim> -o jsonpath='{.spec.volumeName}'
kubectl get volumeattachment | grep <pv-name>
kubectl get pods -o wide | grep <app>   # which node the old pod is on
```

## Cause 1: Deployment rolling update with an RWO volume

The default `RollingUpdate` strategy starts the new pod *before* stopping the old one. If the scheduler puts it on another node, it can't get the disk. Use `Recreate` so the old pod is gone first:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 1
  strategy:
    type: Recreate
```

Or use a **StatefulSet** (one PVC per replica via `volumeClaimTemplates`, pods replaced one at a time), which is the intended controller for stateful apps.

Scaling a Deployment with an RWO PVC above 1 replica hits the same error for pods on other nodes; RWO doesn't support that.

## Cause 2: the old node is down or NotReady

When a node dies, its pods stay `Terminating`/`Unknown` and Kubernetes won't detach the volume, because it can't confirm the disk is no longer in use (a safety measure against data corruption). After the default timeout (about 6 minutes for the attach/detach controller's force-detach) it may recover alone.

To speed it up, once you're sure the node is really off:

```bash
kubectl get nodes
kubectl delete pod <old-pod> --grace-period=0 --force
```

If it's still stuck, remove the stale attachment:

```bash
kubectl get volumeattachment
kubectl delete volumeattachment <name>
```

On Kubernetes 1.28+ you can also mark a shut-down node so its volumes are released:

```bash
kubectl taint nodes <node> node.kubernetes.io/out-of-service=nodeshutdown:NoExecute
```

Remove the taint after the node is recovered or deleted. If the node is gone permanently, `kubectl delete node <node>`.

## Cause 3: a CronJob/Job or second Deployment uses the same PVC

Backup jobs or sidecar Deployments mounting the same RWO claim get scheduled elsewhere. Options: pin them to the same node with pod affinity:

```yaml
affinity:
  podAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchLabels:
          app: myapp
      topologyKey: kubernetes.io/hostname
```

or use ReadWriteMany storage, or volume snapshots for backups.

Note: RWO allows several pods *on the same node* to mount the volume. `ReadWriteOncePod` (1.22+, GA in 1.29) restricts it to one pod.

## Cause 4: you actually need shared storage

If several pods on different nodes must read and write the same files, RWO block storage can't do it. Use a storage class that supports `ReadWriteMany`: AWS EFS CSI, Azure Files, GCP Filestore, NFS, CephFS, Longhorn RWX.

```yaml
spec:
  accessModes: [ReadWriteMany]
  storageClassName: efs-sc
```

## Cause 5: CSI driver failed to detach

If the old pod is gone but the attachment remains, check the CSI controller logs (e.g. `kubectl logs -n kube-system deploy/ebs-csi-controller -c csi-attacher`) and the cloud console: the disk may be stuck "detaching". Detaching it from the cloud side and deleting the `VolumeAttachment` resolves it.
