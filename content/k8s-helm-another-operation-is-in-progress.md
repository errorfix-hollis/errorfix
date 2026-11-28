---
error: "Error: UPGRADE FAILED: another operation (install/upgrade/rollback) is in progress"
error_full: |
  Error: UPGRADE FAILED: another operation (install/upgrade/rollback) is in progress
cat: kubernetes
description: "Helm keeps release state in Secrets, and the latest revision is stuck in a pending-install, pending-upgrade or pending-rollback status, usually because an earlier helm command was interrupted or timed out. Helm refuses to start a new operation until that status is cleared."
tldr: "Find the stuck revision with `helm history RELEASE -n NS`. If an older revision is `deployed`, run `helm rollback RELEASE <that-revision> -n NS`, then upgrade again. If the only revision is `pending-install`, run `helm uninstall RELEASE -n NS` and install again. Last resort: delete the pending revision's secret `sh.helm.release.v1.RELEASE.vN`."
keywords: helm upgrade failed another operation install upgrade rollback is in progress pending-upgrade pending-install pending-rollback stuck release helm history helm rollback sh.helm.release.v1 secret
related: [k8s-helm-cannot-re-use-a-name-that-is-still-in-use, k8s-error-from-server-forbidden, k8s-field-is-immutable]
---
## What it means

Every Helm 3 release revision is stored as a Secret named `sh.helm.release.v1.<release>.v<revision>` in the release namespace. When an install, upgrade or rollback starts, Helm writes the new revision with a `pending-*` status and changes it to `deployed` or `failed` when done.

If the Helm process dies in between (Ctrl-C, CI job cancelled, runner killed, `--wait` timeout while the client lost connection), the revision stays `pending-*` forever and every later command fails with this error.

Confirm it:

```bash
helm history myapp -n prod
# REVISION  STATUS           CHART        DESCRIPTION
# 7         deployed         myapp-1.4.0  Upgrade complete
# 8         pending-upgrade  myapp-1.5.0  Preparing upgrade

helm list -n prod --pending
```

First make sure no other `helm` process (another pipeline, a colleague) is really running against this release. If one is, wait for it.

## Fix 1: roll back to the last good revision

When an earlier revision is `deployed`, roll back to it. This creates a new revision with a final status and unblocks the release:

```bash
helm rollback myapp 7 -n prod
helm upgrade myapp ./chart -n prod -f values.yaml
```

## Fix 2: stuck in pending-install

If the very first install was interrupted, there is no good revision to go back to. Uninstall and install again:

```bash
helm uninstall myapp -n prod
helm install myapp ./chart -n prod -f values.yaml
```

Check that resources you care about (PersistentVolumeClaims, for example) are handled the way you expect before uninstalling; PVCs created by StatefulSet volumeClaimTemplates are not deleted by Helm.

## Fix 3: delete the pending revision secret

If rollback also refuses, remove the stuck revision record itself. This only deletes Helm's bookkeeping, not your workloads:

```bash
kubectl get secrets -n prod -l owner=helm,name=myapp
kubectl delete secret sh.helm.release.v1.myapp.v8 -n prod
helm history myapp -n prod      # latest is now revision 7, deployed
```

Then run your upgrade again. Only delete the newest `pending-*` revision, never the `deployed` one.

## Prevent it

- Don't cancel Helm mid-operation; give CI jobs a timeout longer than Helm's own `--timeout`.
- Use `--atomic` on upgrades so a failed or timed-out upgrade is rolled back automatically instead of left half-done.
- Serialize deployments of the same release in CI (one concurrent job per environment), so two pipelines never upgrade the same release at once.
- If you use `--wait`, set a realistic `--timeout` (default is 5m) for slow rollouts.
