---
error: "Error from server (NotFound): pods \"...\" not found"
error_full: |
  Error from server (NotFound): pods "web-7c9d8b6f4-x2k9p" not found
  Error from server (NotFound): deployments.apps "web" not found
  Error from server (NotFound): namespaces "staging" not found
cat: kubernetes
description: "The API server has no object of that kind with that name in the namespace (and cluster) kubectl is using. Most often it's the wrong namespace or context, or a pod name that changed after a restart."
tldr: "Find it across namespaces: `kubectl get pods -A | grep web`. Then pass the namespace: `kubectl -n staging logs <pod>`, or set it: `kubectl config set-context --current --namespace=staging`. Check `kubectl config current-context`. Use `deploy/web` instead of a pod name: `kubectl logs deploy/web`."
keywords: kubernetes kubectl error from server notfound pods not found deployment not found namespace not found wrong namespace context pod name changed kubectl logs deploy
related: [k8s-the-server-doesnt-have-a-resource-type, k8s-crashloopbackoff, k8s-error-from-server-forbidden]
---
## What it means

kubectl reached the cluster, the resource *type* exists, but there is no object with that name in the namespace being queried. (If the type itself is unknown you get `the server doesn't have a resource type` instead.) Every kubectl command uses one cluster context and one namespace, `default` unless configured otherwise.

```bash
kubectl config current-context
kubectl config view --minify -o jsonpath='{..namespace}'; echo
```

## Cause 1: wrong namespace

The object exists, but in another namespace:

```bash
kubectl get pods -A | grep web
kubectl get deploy -A --field-selector metadata.name=web
```

Then either pass `-n` every time or change the default namespace for the current context:

```bash
kubectl -n staging get pods
kubectl config set-context --current --namespace=staging
```

`kubectl apply -f` also respects `metadata.namespace` in the manifest, so an object may have been created somewhere other than where you're looking.

## Cause 2: wrong cluster context

You're talking to a different cluster (local kind/minikube vs. staging vs. prod):

```bash
kubectl config get-contexts
kubectl config use-context my-staging
```

## Cause 3: the pod name changed

Pods managed by a Deployment, ReplicaSet or Job get new random suffixes each time they're recreated (rollout, crash, node drain, scaling). An old name copied from earlier output no longer exists. Refer to the controller instead:

```bash
kubectl logs deploy/web
kubectl logs deploy/web --previous        # last crashed container
kubectl exec -it deploy/web -- sh
kubectl get pods -l app=web               # by label
```

## Cause 4: the object really was deleted

Check events and the controller that owned it:

```bash
kubectl get events -n staging --sort-by=.lastTimestamp | tail -20
kubectl get rs,deploy,job -n staging
```

Helm `uninstall`, `kubectl delete -f`, Argo CD/Flux pruning, TTL on finished Jobs (`ttlSecondsAfterFinished`) and namespace deletion all remove objects.

## Cause 5: namespace not found on apply

`Error from server (NotFound): error when creating "app.yaml": namespaces "staging" not found` means the namespace must exist first:

```bash
kubectl create namespace staging
# or with Helm
helm install web ./chart -n staging --create-namespace
```

In a single manifest, put the `Namespace` object first, or apply namespaces in a separate step.

## Cause 6: name typos and resource types

Names are case-sensitive and must be exact. Make sure the kind matches: a Service named `web` won't be found with `kubectl get deploy web`. List names:

```bash
kubectl get all -n staging
kubectl api-resources --namespaced=true | less
```

## Avoid the error in scripts

`kubectl get ... --ignore-not-found` and `kubectl delete ... --ignore-not-found` return success when the object is missing.
