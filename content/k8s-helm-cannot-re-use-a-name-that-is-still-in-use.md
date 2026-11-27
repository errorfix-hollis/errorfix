---
error: "Error: INSTALLATION FAILED: cannot re-use a name that is still in use"
error_full: |
  Error: INSTALLATION FAILED: cannot re-use a name that is still in use
cat: kubernetes
description: "helm install was run with a release name that already exists in that namespace, possibly as a failed or pending release. Upgrade the existing release, or uninstall it first."
tldr: "Use `helm upgrade --install myrelease ./chart -n myns` instead of `helm install` so it works whether or not the release exists. To start over: `helm list -a -n myns` to find it, then `helm uninstall myrelease -n myns`. A release stuck in `pending-install` can be removed the same way."
keywords: helm install failed cannot re-use a name that is still in use release name exists helm upgrade --install helm list -a uninstall pending-install failed release kubernetes namespace
related: [k8s-field-is-immutable, k8s-error-from-server-forbidden, k8s-no-matches-for-kind]
---
## What it means

Helm 3 stores each release as a Secret in the release's namespace (`sh.helm.release.v1.<name>.v<revision>`). `helm install` refuses to create a release whose name already has records there — even if the previous install **failed** or was interrupted, and even if none of its pods are running.

Find it (note `-a` / `--all`, which includes failed and pending releases that `helm list` hides):

```bash
helm list -a -n myns
helm status myrelease -n myns
kubectl get secrets -n myns -l owner=helm,name=myrelease
```

Release names are per namespace: the same name can exist in two namespaces. Check you're looking at the right one (`-n`, or the namespace from your current kube context).

## Fix 1: use upgrade --install (idempotent)

For scripts and CI pipelines, this is the standard command — it installs if missing, upgrades if present:

```bash
helm upgrade --install myrelease ./chart -n myns --create-namespace -f values.yaml
```

Add `--atomic` so a failed install/upgrade is rolled back automatically instead of leaving a failed release behind, and `--wait` to wait for resources to become ready.

## Fix 2: uninstall the old release and install again

If you really want a fresh install:

```bash
helm uninstall myrelease -n myns
helm install myrelease ./chart -n myns
```

This deletes the chart's resources. PersistentVolumeClaims created by StatefulSets are usually **not** deleted, so data volumes survive; delete them manually if you want a clean slate.

## Fix 3: release stuck in pending-install / pending-upgrade

If an install was killed (Ctrl+C, CI timeout), the release may be stuck in `pending-install`, and later commands fail with this error or `another operation (install/upgrade/rollback) is in progress`.

```bash
helm history myrelease -n myns
```

- Stuck first install: `helm uninstall myrelease -n myns`, then install again.
- Stuck upgrade with an earlier good revision: `helm rollback myrelease <good-revision> -n myns`.

As a last resort, delete the Secret of the stuck revision (only that one):

```bash
kubectl delete secret sh.helm.release.v1.myrelease.v3 -n myns
```

## Fix 4: just pick another name

If the existing release is someone else's (shared cluster), install under a different name or namespace, or let Helm generate one with `helm install ./chart --generate-name`.

## Related: resources exist but no release

If resources from the chart already exist without Helm owning them, you get a different error: `rendered manifests contain a resource that already exists ... invalid ownership metadata`. Delete those objects or adopt them by adding the `app.kubernetes.io/managed-by: Helm` label and `meta.helm.sh/release-name` / `meta.helm.sh/release-namespace` annotations.
