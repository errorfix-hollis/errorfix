---
error: "pod has unbound immediate PersistentVolumeClaims"
error_full: |
  Warning  FailedScheduling  default-scheduler  0/3 nodes are available: pod has unbound immediate PersistentVolumeClaims. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.
cat: kubernetes
description: The pod references a PersistentVolumeClaim that is still Pending — no PersistentVolume has been bound to it — so the scheduler can't place the pod. Usually there's no default StorageClass, no provisioner, or no matching PV.
tldr: "Run `kubectl get pvc` and `kubectl describe pvc <name>` to see why it's Pending. Check `kubectl get storageclass` for a `(default)` class; set `storageClassName` on the PVC or mark one default with `kubectl patch storageclass <sc> -p '{\"metadata\":{\"annotations\":{\"storageclass.kubernetes.io/is-default-class\":\"true\"}}}'`. With static PVs, make sure size, accessModes and storageClassName match."
keywords: kubernetes k8s pod has unbound immediate persistentvolumeclaims pvc pending failedscheduling storageclass default provisioner persistentvolume no persistent volumes available waitforfirstconsumer
related: [k8s-crashloopbackoff, k8s-imagepullbackoff, k8s-oomkilled]
---
## What it means

A PVC with `volumeBindingMode: Immediate` (the default for many StorageClasses, and for PVCs without one) must be bound to a PersistentVolume before any pod using it can be scheduled. The pod stays `Pending` with this message until the claim binds. The fix is never on the pod — find out why the PVC is stuck.

```bash
kubectl get pvc -n myns
kubectl describe pvc data-myapp-0 -n myns     # read the Events at the bottom
```

## Cause 1: no default StorageClass

If the PVC has no `storageClassName` and the cluster has no default class, nothing provisions a volume. Events show `no persistent volumes available for this claim and no storage class is set`.

```bash
kubectl get storageclass
```

A default one is marked `(default)`. Either set it on the PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
spec:
  storageClassName: standard     # a name from kubectl get storageclass
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 5Gi
```

or make an existing class the default:

```bash
kubectl patch storageclass standard \
  -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

Note: `storageClassName` can't be changed on an existing PVC — delete and recreate it (for StatefulSets, delete the PVC so it's recreated from `volumeClaimTemplates`).

## Cause 2: no provisioner on a bare-metal / local cluster

kubeadm and bare-metal clusters ship no dynamic provisioner. Install one, for example the Rancher local-path provisioner (k3s includes it as `local-path`), an NFS provisioner, or your storage vendor's CSI driver. Minikube and kind include a default `standard` class; on minikube make sure the addons are on:

```bash
minikube addons enable storage-provisioner
minikube addons enable default-storageclass
```

## Cause 3: the provisioner is failing

If a StorageClass exists, `kubectl describe pvc` shows provisioner events such as `waiting for a volume to be created, either by external provisioner "ebs.csi.aws.com"` or `ProvisioningFailed`. Check the CSI driver pods:

```bash
kubectl get pods -n kube-system | grep -i csi
kubectl logs -n kube-system <csi-controller-pod> -c csi-provisioner
```

On EKS, the EBS CSI driver add-on must be installed (it's required since Kubernetes 1.23) and its IAM role must have EBS permissions. Quota or zone problems also appear here.

## Cause 4: static PV doesn't match the claim

With manually created PVs, a PVC binds only to a PV that satisfies all of:

- capacity ≥ requested storage
- the same `accessModes` (e.g. `ReadWriteOnce`)
- the same `storageClassName` (both empty `""` counts as a match)
- `volumeMode` and any `selector` labels

```bash
kubectl get pv
```

A PV in `Released` status was bound to a deleted claim and won't rebind automatically. Remove its `claimRef` to make it `Available` again (only if you're sure the data can be reused):

```bash
kubectl patch pv my-pv --type json -p '[{"op":"remove","path":"/spec/claimRef"}]'
```

## Cause 5: PVC in the wrong namespace or misnamed

PVCs are namespaced. A pod in `prod` can't use a claim in `default`. Check that `claimName` in the pod matches exactly:

```bash
kubectl get pod mypod -o jsonpath='{.spec.volumes[*].persistentVolumeClaim.claimName}'
```

## Tip: WaitForFirstConsumer

For zonal storage, use a StorageClass with `volumeBindingMode: WaitForFirstConsumer` so the volume is created in the zone where the pod is scheduled. With it, the PVC stays Pending until a pod uses it — that's normal.
