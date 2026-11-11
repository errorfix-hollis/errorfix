---
error: "error: the server doesn't have a resource type"
error_full: |
  error: the server doesn't have a resource type "ingressroutes"
  error: the server doesn't have a resource type "pod"
cat: kubernetes
description: "kubectl asked the API server for a resource name that isn't in its discovery list. Either the name is misspelled, the CRD that defines it isn't installed, kubectl's discovery cache is stale, or you're talking to the wrong cluster."
tldr: "List what the cluster serves: `kubectl api-resources | grep -i <name>`. Fix the spelling or install the CRD (e.g. the operator/Helm chart that provides it). If the CRD was just installed, clear the cache: `rm -rf ~/.kube/cache`. Check you're on the right cluster with `kubectl config current-context`."
keywords: kubernetes kubectl error the server doesnt have a resource type api-resources crd custom resource definition discovery cache context ingressroute certificate servicemonitor
related: [k8s-no-matches-for-kind, k8s-error-from-server-forbidden, k8s-connection-to-the-server-localhost-8080-was-refused]
---
## What it means

When you run `kubectl get foo`, kubectl first maps `foo` to a REST resource using the API server's *discovery* data (which kubectl caches under `~/.kube/cache`). If no API group serves a resource called `foo` (by plural, singular, short name or kind), you get this error before any request is made.

The applying-manifests version of the same problem is `no matches for kind "X" in version "Y"`.

## Cause 1: typo or wrong name

Check the names the cluster accepts:

```bash
kubectl api-resources                       # NAME, SHORTNAMES, APIVERSION, KIND
kubectl api-resources | grep -i ingress
```

Resource names are case-insensitive and accept the plural (`deployments`), singular (`deployment`), and short name (`deploy`). Things that look valid but aren't:

- `kubectl get container` (containers aren't API resources; use `kubectl get pods` and `kubectl describe pod`)
- `kubectl get helm` / `kubectl get chart` (Helm releases aren't resources; use `helm list -A`)

## Cause 2: the CRD isn't installed

Custom resources such as `certificates` (cert-manager), `ingressroutes` (Traefik), `servicemonitors` (Prometheus Operator), `virtualservices` (Istio) or `applications` (Argo CD) only exist once their CustomResourceDefinition is installed.

```bash
kubectl get crd | grep -i servicemonitor
```

If it's missing, install the operator or its CRDs. Examples:

```bash
# cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.1/cert-manager.yaml

# Prometheus Operator CRDs via Helm
helm install prometheus-operator-crds prometheus-community/prometheus-operator-crds
```

Use the version that matches your setup; Helm charts sometimes skip CRDs on upgrade (`helm upgrade` never updates the `crds/` folder), so you may need to apply them manually.

## Cause 3: stale discovery cache

If you installed a CRD seconds ago, or the cluster was upgraded, kubectl may still use cached discovery data. Clear it:

```bash
rm -rf ~/.kube/cache/discovery ~/.kube/cache/http
kubectl api-resources | grep -i <name>
```

Also make sure the CRD finished registering:

```bash
kubectl wait --for condition=established crd/ingressroutes.traefik.io --timeout=60s
```

## Cause 4: wrong cluster or context

The resource exists, just not in the cluster you're talking to:

```bash
kubectl config current-context
kubectl config get-contexts
kubectl config use-context prod-cluster
```

The same message appears for **built-in** types (`pods`, `nodes`) when discovery fails entirely, e.g. the kubeconfig points at something that isn't a Kubernetes API, or RBAC forbids discovery. Run with verbose output to see the underlying errors:

```bash
kubectl get pods -v=6
```

If you see `401`/`403` on `/api` or `/apis`, fix authentication first (`You must be logged in to the server`, `Forbidden`).

## Cause 5: removed API in a newer Kubernetes version

Resources that were removed (e.g. `podsecuritypolicies` in 1.25) no longer appear in discovery. Use the replacement (Pod Security Admission labels on namespaces) and check the Kubernetes deprecation guide for your version.

## Cause 6: aggregated API not available

For resources served by an aggregated API server (e.g. `kubectl top` and `metrics.k8s.io` from metrics-server), check its APIService:

```bash
kubectl get apiservices | grep -v True
```

An entry with `False (MissingEndpoints)` means its backing pod is down; fix that deployment.
