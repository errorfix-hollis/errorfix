---
error: "Error from server (BadRequest): container is waiting to start: ContainerCreating"
error_full: |
  Error from server (BadRequest): container "app" in pod "web-7d9f8b6c5-x2k4p" is waiting to start: ContainerCreating
  Error from server (BadRequest): container "app" in pod "web-7d9f8b6c5-x2k4p" is waiting to start: trying and failing to pull image
  Error from server (BadRequest): container "app" in pod "web-7d9f8b6c5-x2k4p" is waiting to start: image can't be pulled
cat: kubernetes
description: "`kubectl logs` has nothing to show because the container never started. The real problem is in the pod's events: image pull failures, missing volumes, secrets or ConfigMaps, or a slow first pull."
tldr: "Run `kubectl describe pod POD` and read the Events at the bottom; `kubectl get events --sort-by=.lastTimestamp` also helps. Fix what it reports (wrong image tag, missing imagePullSecret, missing Secret/ConfigMap/PVC, CNI errors). If it's just a large image still pulling, wait and retry `kubectl logs -f`."
keywords: kubernetes kubectl logs error from server badrequest container is waiting to start containercreating podinitializing trying and failing to pull image image can't be pulled describe pod events failedmount
related: [k8s-imagepullbackoff, k8s-createcontainerconfigerror, k8s-pod-has-unbound-immediate-persistentvolumeclaims]
---
## What it means

`kubectl logs` reads the output of a running (or exited) container. This error says the container hasn't started yet, so there are no logs. The last part of the message is the container's waiting reason:

| Reason | Meaning |
|---|---|
| `ContainerCreating` | still pulling the image or mounting volumes, or stuck doing so |
| `PodInitializing` | init containers are still running |
| `trying and failing to pull image` / `image can't be pulled` | `ErrImagePull` / `ImagePullBackoff` |
| `CreateContainerConfigError` | a referenced Secret/ConfigMap key is missing |

The details are always in the events:

```bash
kubectl describe pod web-7d9f8b6c5-x2k4p      # read "Events:" at the bottom
kubectl get events -n NAMESPACE --sort-by=.lastTimestamp | tail -20
```

## Cause 1: image pull problems

Events show `Failed to pull image ... not found` or `unauthorized`. Check:

- tag exists: `docker manifest inspect registry/app:1.4.2`
- private registry → add an `imagePullSecrets` entry:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io --docker-username=USER --docker-password=TOKEN
```

```yaml
spec:
  imagePullSecrets:
    - name: regcred
```

See the ImagePullBackOff page for the full list.

## Cause 2: volume mount failures (`FailedMount`)

Events like `MountVolume.SetUp failed for volume "config" : configmap "app-config" not found` or `secret "db-creds" not found` keep the pod in `ContainerCreating` forever. Create the object in the **same namespace**:

```bash
kubectl get configmap,secret -n NAMESPACE
kubectl create configmap app-config --from-file=config.yaml -n NAMESPACE
```

For PVCs, check `kubectl get pvc`: a `Pending` claim or `Multi-Attach error` (RWO volume still attached to another node) blocks start-up.

## Cause 3: init containers still running or failing

`PodInitializing` means init containers haven't finished. Look at their logs:

```bash
kubectl logs POD -c init-container-name
kubectl get pod POD -o jsonpath='{.spec.initContainers[*].name}'
```

## Cause 4: networking / sandbox errors

`Failed to create pod sandbox` or `network plugin is not ready: cni config uninitialized` point to the node's CNI (Calico, Flannel, Cilium). Check the CNI pods: `kubectl get pods -n kube-system -o wide` and the node: `kubectl describe node NODE`.

## Cause 5: it's simply still starting

The first pull of a multi-GB image can take minutes. Wait for it, and follow logs once it's up:

```bash
kubectl wait --for=condition=Ready pod/POD --timeout=300s && kubectl logs -f POD
```

## Getting logs from a crashing container

If the pod is in `CrashLoopBackOff`, the current container may be waiting for its restart backoff. Read the previous attempt instead:

```bash
kubectl logs POD --previous
```
