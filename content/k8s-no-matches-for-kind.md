---
error: "error: resource mapping not found ... no matches for kind \"Deployment\" in version \"extensions/v1beta1\""
error_full: |
  error: resource mapping not found for name: "web" namespace: "" from "deploy.yaml": no matches for kind "Deployment" in version "extensions/v1beta1"
  ensure CRDs are installed first
  error: unable to recognize "deploy.yaml": no matches for kind "Ingress" in version "networking.k8s.io/v1beta1"
cat: kubernetes
description: The cluster has no API for that kind/apiVersion combination. Either the apiVersion was removed in your Kubernetes version (old manifests and Helm charts), or the kind belongs to a CRD that isn't installed yet.
tldr: "Run `kubectl api-resources | grep -i <kind>` to see the apiVersion your cluster serves, and update `apiVersion:` (e.g. Deployment → `apps/v1`, Ingress → `networking.k8s.io/v1`, CronJob → `batch/v1`). For custom kinds (Certificate, ServiceMonitor, ...) install the operator/CRDs first, then apply."
keywords: kubernetes kubectl no matches for kind in version resource mapping not found unable to recognize ensure crds are installed first apiversion deprecated removed extensions/v1beta1 apps/v1 ingress networking.k8s.io/v1 helm crd
related: [k8s-error-from-server-forbidden, k8s-crashloopbackoff, k8s-connection-to-the-server-localhost-8080-was-refused]
---
## What it means

`kubectl` maps each manifest's `apiVersion` + `kind` to a REST endpoint by asking the API server what it supports. If nothing matches, you get `no matches for kind`. Newer kubectl phrases it as `resource mapping not found ... ensure CRDs are installed first`; older versions say `unable to recognize`.

See what your cluster serves:

```bash
kubectl version
kubectl api-resources | grep -i ingress
kubectl api-versions | grep networking
kubectl explain deployment | head -3      # shows GROUP and VERSION
```

## Cause 1: the apiVersion was removed

Kubernetes removes beta APIs after deprecation. Common replacements:

| Kind | Old apiVersion | Use | Removed in |
|---|---|---|---|
| Deployment, DaemonSet, ReplicaSet, StatefulSet | `extensions/v1beta1`, `apps/v1beta1`, `apps/v1beta2` | `apps/v1` | 1.16 |
| Ingress | `extensions/v1beta1`, `networking.k8s.io/v1beta1` | `networking.k8s.io/v1` | 1.22 |
| CustomResourceDefinition | `apiextensions.k8s.io/v1beta1` | `apiextensions.k8s.io/v1` | 1.22 |
| CronJob | `batch/v1beta1` | `batch/v1` | 1.25 |
| PodDisruptionBudget | `policy/v1beta1` | `policy/v1` | 1.25 |
| HorizontalPodAutoscaler | `autoscaling/v2beta2` | `autoscaling/v2` | 1.26 |
| PodSecurityPolicy | `policy/v1beta1` | (removed; use Pod Security Admission) | 1.25 |

Changing the version is not always enough — the schema can change too:

- `apps/v1` Deployments **require** `spec.selector.matchLabels` matching the template labels.
- `networking.k8s.io/v1` Ingress uses `pathType` and `backend.service.name` / `backend.service.port.number` instead of `serviceName` / `servicePort`.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  ingressClassName: nginx
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```

The `kubectl convert` plugin can rewrite old manifests: `kubectl convert -f old.yaml --output-version apps/v1`. Tools like `pluto` or `kubent` scan a cluster or Helm releases for removed APIs before you upgrade.

## Cause 2: the CRD isn't installed (yet)

Kinds such as `Certificate` (cert-manager), `ServiceMonitor` (Prometheus Operator), `IngressRoute` (Traefik) or `Application` (Argo CD) only exist after their CRDs are installed.

```bash
kubectl get crd | grep -i certificate
```

Install the operator or its CRDs first, e.g. for cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.crds.yaml
```

If the CRDs and resources are in the same file or directory, `kubectl apply` may try the resource before the CRD is registered. Apply CRDs in a separate step, then wait:

```bash
kubectl wait --for=condition=Established crd/certificates.cert-manager.io
```

## Cause 3: typo in apiVersion or kind

`kind` is case-sensitive (`Deployment`, not `deployment`), and the group must be exact (`apps/v1`, not `app/v1`). A broken indentation can also move `kind:` somewhere unexpected — check the file in the [YAML validator](/tools/yaml-validator/).

## Cause 4: wrong cluster / context

The manifest may be fine for production but you're pointed at an old local cluster. Check `kubectl config current-context` and `kubectl version`.

## Cause 5: Helm charts with old templates

`helm upgrade` fails the same way when a chart or a stored release uses removed APIs. Upgrade the chart version; for a release stuck on removed APIs, the `helm mapkubeapis` plugin rewrites the stored release manifest.
