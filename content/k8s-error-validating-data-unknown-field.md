---
error: "error validating data: ValidationError(Deployment.spec): unknown field \"containers\" in io.k8s.api.apps.v1.DeploymentSpec"
error_full: |
  error: error validating "deployment.yaml": error validating data: ValidationError(Deployment.spec): unknown field "containers" in io.k8s.api.apps.v1.DeploymentSpec; if you choose to ignore these errors, turn validation off with --validate=false
cat: kubernetes
description: "A field in your manifest doesn't exist at that position in the resource's schema. Almost always it's indented at the wrong level, misspelled, or belongs to a different API version."
tldr: "Look up where the field belongs with `kubectl explain deployment.spec.template.spec --recursive | less` and fix the indentation or spelling. In a Deployment, `containers` goes under `spec.template.spec`, not `spec`. Validate before applying with `kubectl apply --dry-run=server -f file.yaml`. Don't just use `--validate=false`: the field would be silently dropped."
keywords: kubernetes error validating data validationerror unknown field kubectl apply strict decoding error unknown field indentation deployment spec containers kubectl explain validate=false
related: [k8s-error-converting-yaml-to-json-mapping-values-are-not-allowed, k8s-no-matches-for-kind, k8s-field-is-immutable]
---
## What it means

kubectl validates manifests against the API server's OpenAPI schema. `unknown field "X" in <Type>` means the type at that location has no field called `X`. Newer clusters (server-side field validation, Kubernetes 1.25+) report the same problem as:

```
Error from server (BadRequest): error when creating "deployment.yaml": Deployment in version "v1" cannot be handled as a Deployment: strict decoding error: unknown field "spec.containers"
```

The path in parentheses (`Deployment.spec`) or the dotted path tells you exactly where the bad field is.

## Cause 1: wrong indentation (most common)

In a Deployment, pod settings live under `spec.template.spec`:

```yaml
# Wrong: containers directly under Deployment spec
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  containers:
    - name: web
      image: nginx:1.27
```

```yaml
# Right
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80
```

Other classics: `env`, `resources` or `volumeMounts` indented at the pod level instead of under a container; `volumes` under a container instead of the pod spec; `ports` of a Service placed under `metadata`.

A [YAML validator](/tools/yaml-validator/) helps you see the actual nesting, since one extra or missing space changes the parent.

## Cause 2: misspelled or wrongly cased field

Field names are case-sensitive camelCase:

| Wrong | Right |
|---|---|
| `containerport` | `containerPort` |
| `imagepullpolicy` | `imagePullPolicy` |
| `env_from` | `envFrom` |
| `volumeMount` | `volumeMounts` |
| `label` | `labels` |

## Cause 3: field from another API version or newer Kubernetes

A field may exist only in a newer API version or Kubernetes release than your cluster, or in a CRD version that isn't installed. Check what your cluster supports:

```bash
kubectl version
kubectl explain deployment.spec.template.spec.containers --api-version=apps/v1
kubectl api-resources | grep -i ingress
```

For CRDs (cert-manager, Istio, Argo...), make sure the installed CRD version matches the docs you're following.

## Cause 4: Helm/Kustomize output

With Helm, the bad YAML is generated. Render it and inspect:

```bash
helm template myrelease ./chart -f values.yaml > out.yaml
kubectl apply --dry-run=server -f out.yaml
```

Often a `toYaml` block has the wrong `nindent`, or a value was put at the wrong level in `values.yaml`.

## Find the right place for a field

`kubectl explain` prints the schema from your actual cluster:

```bash
kubectl explain deployment.spec
kubectl explain pod.spec.containers.resources
kubectl explain deployment --recursive | grep -n containers
```

## Validate before applying

```bash
kubectl apply --dry-run=server -f deployment.yaml     # full server-side validation
kubectl apply --validate=strict -f deployment.yaml    # fail on unknown fields (default)
```

## About --validate=false

The message suggests `--validate=false`, but that only hides the problem: the unknown field is dropped and your setting silently has no effect (e.g. containers missing, limits not applied). Fix the manifest instead.
