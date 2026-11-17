---
error: "spec.selector: Invalid value: field is immutable"
error_full: |
  The Deployment "web" is invalid: spec.selector: Invalid value: v1.LabelSelector{MatchLabels:map[string]string{"app":"web-v2"}, MatchExpressions:[]v1.LabelSelectorRequirement(nil)}: field is immutable
cat: kubernetes
description: "You tried to change a field Kubernetes doesn't allow to be updated in place, such as a Deployment's spec.selector, a Job's pod template, a Service's clusterIP or a PVC's storageClassName. The object must be deleted and recreated."
tldr: "Either revert the change to the immutable field, or delete and recreate the object: `kubectl delete deployment web && kubectl apply -f deploy.yaml` (or `kubectl replace --force -f deploy.yaml`). For Jobs, delete the old Job before applying; in Helm, avoid changing selector labels between releases."
keywords: kubernetes field is immutable spec.selector deployment invalid value labelselector job spec.template kubectl apply replace force helm upgrade clusterip
related: [k8s-no-matches-for-kind, k8s-error-converting-yaml-to-json-mapping-values-are-not-allowed, k8s-error-from-server-forbidden]
---
## What it means

The API server rejected an update because it changes a field that is fixed after creation. `kubectl apply`, `helm upgrade` and Argo CD/Flux all send updates, so they all fail the same way. The object keeps running with its old spec.

Commonly immutable fields:

| Kind | Immutable field |
|---|---|
| Deployment / StatefulSet / DaemonSet / ReplicaSet | `spec.selector` (apps/v1) |
| StatefulSet | most of `spec` except `replicas`, `template`, `updateStrategy`, `persistentVolumeClaimRetentionPolicy`, `minReadySeconds`, `ordinals` - including `volumeClaimTemplates`, `serviceName`, `podManagementPolicy` |
| Job | `spec.template`, `spec.selector`, `spec.completions` (mostly) |
| Service | `spec.clusterIP`, `spec.clusterIPs`, `spec.ipFamilies` (partly) |
| PersistentVolumeClaim | `spec` except `resources.requests` (expansion) |
| Pod | almost all of `spec` except container `image` and a few others |
| ConfigMap / Secret with `immutable: true` | `data` |

## Cause 1: changing Deployment selector labels

```yaml
spec:
  selector:
    matchLabels:
      app: web-v2      # was: app: web
```

The selector decides which pods (and ReplicaSets) the Deployment owns; changing it would orphan the running pods, so it's locked.

## Fix 1: revert, or recreate

If you only wanted new labels on pods, add them to `spec.template.metadata.labels` and leave `spec.selector` alone - extra pod labels are fine.

If the selector must change, recreate the Deployment (causes downtime unless you run old and new side by side):

```bash
kubectl delete deployment web
kubectl apply -f deploy.yaml
# or in one step:
kubectl replace --force -f deploy.yaml
```

Zero-downtime alternative: deploy it under a new name (`web-v2`) with the new selector, point the Service at it, then delete the old one.

## Cause 2: re-applying a Job

Jobs can't have their pod template changed. Re-running CI that applies an edited Job (new image tag, new args) fails with `spec.template: Invalid value: ... field is immutable`.

## Fix 2: delete the Job first

```bash
kubectl delete job db-migrate --ignore-not-found
kubectl apply -f job.yaml
```

Better: set `ttlSecondsAfterFinished: 300` so finished Jobs are cleaned up automatically, give each run a unique name (`generateName:` with `kubectl create`), or use Helm hooks with `helm.sh/hook-delete-policy: before-hook-creation`.

## Cause 3: Helm chart upgrades that change selector labels

Charts that put `{{ .Chart.Version }}` or `helm.sh/chart` into `selector.matchLabels` break every upgrade. Upstream chart major versions sometimes change selectors on purpose; their upgrade notes then say to delete the Deployment/StatefulSet first.

Fix the template so selectors contain only stable labels (`app.kubernetes.io/name`, `app.kubernetes.io/instance`), then delete the object once and run `helm upgrade` again. For StatefulSets you can keep the pods (and their volumes) running while recreating the object:

```bash
kubectl delete statefulset db --cascade=orphan
helm upgrade my-release ./chart
```

## Cause 4: Service clusterIP or PVC changes

- A Service manifest with a hard-coded `clusterIP:` that differs from the live one fails. Remove the field (let Kubernetes keep its value) or delete/recreate the Service.
- A PVC's `storageClassName`, `accessModes` or volume can't change. Only `resources.requests.storage` can grow (if the StorageClass has `allowVolumeExpansion: true`). To move data to a new class, create a new PVC and copy.

## Check what would change before applying

```bash
kubectl diff -f deploy.yaml
```

Validate syntax first with the [YAML validator](/tools/yaml-validator/).
