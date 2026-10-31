---
error: "Error from server (Forbidden): User cannot list resource in API group at the cluster scope"
error_full: |
  Error from server (Forbidden): pods is forbidden: User "jane@example.com" cannot list resource "pods" in API group "" in the namespace "default"
  Error from server (Forbidden): nodes is forbidden: User "system:serviceaccount:ci:deployer" cannot list resource "nodes" in API group "" at the cluster scope
cat: kubernetes
description: Kubernetes authenticated you, but RBAC doesn't grant your user or service account the verb (get, list, create...) on that resource in that namespace. Fix the Role/ClusterRole and binding, or use the right namespace or context.
tldr: "Check with `kubectl auth can-i list pods -n <ns>` and `kubectl config current-context`. Grant access: `kubectl create role pod-reader --verb=get,list,watch --resource=pods -n <ns>` then `kubectl create rolebinding pod-reader-binding --role=pod-reader --user=<user> -n <ns>` (or `--serviceaccount=<ns>:<sa>`). Use a ClusterRole + ClusterRoleBinding for cluster-scoped resources like nodes."
keywords: kubernetes kubectl error from server forbidden user cannot list resource in api group namespace cluster scope rbac role rolebinding clusterrole serviceaccount auth can-i
related: [k8s-crashloopbackoff, k8s-imagepullbackoff]
---
## What it means

The message tells you exactly what's missing:

```
User "system:serviceaccount:ci:deployer" cannot list resource "nodes" in API group "" at the cluster scope
      ^ who                                    ^ verb        ^ resource  ^ group  ^ where
```

API group `""` is the core group (pods, services, configmaps, secrets, nodes). Deployments are in `apps`, Ingresses in `networking.k8s.io`. The request passed authentication; it failed **authorisation** (RBAC). An authentication problem would say `Unauthorized` instead.

## Step 1: confirm who you are and where

```bash
kubectl config current-context
kubectl config view --minify -o jsonpath='{..namespace}'; echo
kubectl auth whoami          # kubectl 1.28+
kubectl auth can-i list pods -n default
kubectl auth can-i --list -n default
```

Often the fix is just the namespace: you have rights in `team-a`, but your context defaults to `default`. Use `-n team-a` or:

```bash
kubectl config set-context --current --namespace=team-a
```

## Fix 2: grant a namespaced Role

For resources inside a namespace (pods, deployments, secrets):

```bash
kubectl create role pod-reader --verb=get,list,watch --resource=pods -n team-a
kubectl create rolebinding pod-reader-binding --role=pod-reader --user=jane@example.com -n team-a
```

For a service account, bind with `--serviceaccount=<namespace>:<name>`:

```bash
kubectl create rolebinding deployer-edit --clusterrole=edit --serviceaccount=ci:deployer -n team-a
```

Binding a built-in ClusterRole (`view`, `edit`, `admin`) with a RoleBinding limits it to that namespace — a common, convenient pattern.

## Fix 3: cluster-scoped resources

Nodes, namespaces, PersistentVolumes, CRDs and ClusterRoles aren't namespaced, so a Role can't grant them. Use a ClusterRole and ClusterRoleBinding:

```bash
kubectl create clusterrole node-reader --verb=get,list,watch --resource=nodes
kubectl create clusterrolebinding node-reader-binding --clusterrole=node-reader --serviceaccount=ci:deployer
```

## Fix 4: pods calling the API

An app running in a pod uses its service account (`default` unless set). Give it its own:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata: { name: deployer, namespace: ci }
---
# in the Pod/Deployment spec
spec:
  serviceAccountName: deployer
```

then bind a role to `ci:deployer` as above. Test as that account:

```bash
kubectl auth can-i list pods -n team-a --as=system:serviceaccount:ci:deployer
```

## Fix 5: managed clusters (EKS, GKE, AKS)

- **EKS**: your IAM identity must be mapped to a Kubernetes user/group (access entries, or the `aws-auth` ConfigMap in older setups). Check which IAM identity you're using with `aws sts get-caller-identity`.
- **GKE**: IAM roles like "Kubernetes Engine Developer" grant API access in addition to RBAC.
- **AKS** with Azure RBAC: role assignments are done in Azure (`az role assignment create`).

## Least privilege

Avoid "fixing" this with `cluster-admin`. Grant only the verbs and resources needed, and prefer namespaced RoleBindings.
