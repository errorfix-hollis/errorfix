---
error: "The connection to the server localhost:8080 was refused - did you specify the right host or port?"
error_full: |
  E1103 09:12:44.123456   12345 memcache.go:265] couldn't get current server API group list: Get "http://localhost:8080/api?timeout=32s": dial tcp 127.0.0.1:8080: connect: connection refused
  The connection to the server localhost:8080 was refused - did you specify the right host or port?
cat: kubernetes
description: kubectl found no kubeconfig, so it fell back to its built-in default of http://localhost:8080. Point kubectl at your cluster's kubeconfig.
tldr: "kubectl has no config. On a kubeadm control plane: `mkdir -p ~/.kube && sudo cp /etc/kubernetes/admin.conf ~/.kube/config && sudo chown $(id -u):$(id -g) ~/.kube/config`. On k3s: `export KUBECONFIG=/etc/rancher/k3s/k3s.yaml`. For cloud clusters regenerate it (`aws eks update-kubeconfig ...`, `gcloud container clusters get-credentials ...`, `az aks get-credentials ...`)."
keywords: kubernetes kubectl connection to the server localhost:8080 was refused did you specify the right host or port kubeconfig admin.conf k3s minikube sudo KUBECONFIG
related: [k8s-error-from-server-forbidden, k8s-crashloopbackoff, docker-cannot-connect-to-the-docker-daemon]
---
## What it means

When kubectl has no cluster configured, it defaults to `http://localhost:8080` — the old insecure API port that no modern cluster exposes. So this error almost never means "the API server on 8080 is down"; it means **kubectl couldn't find a kubeconfig** (or the one it found has no current context).

kubectl looks for config in this order:

1. `--kubeconfig` flag
2. `KUBECONFIG` environment variable (colon-separated list)
3. `~/.kube/config`

Check what it sees:

```bash
echo $KUBECONFIG
ls -l ~/.kube/config
kubectl config view --minify
kubectl config current-context
```

An empty `kubectl config view` confirms the diagnosis.

## Fix 1: kubeadm cluster (on the control-plane node)

kubeadm writes the admin config to `/etc/kubernetes/admin.conf`. Copy it for your user — exactly what `kubeadm init` prints at the end:

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

As root, you can instead `export KUBECONFIG=/etc/kubernetes/admin.conf`.

On a **worker node** there's no admin config by default — run kubectl from the control plane, or copy the config file over (`scp`) to the machine you want to use.

## Fix 2: k3s / RKE2 / MicroK8s

```bash
# k3s
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml      # readable by root by default
sudo k3s kubectl get nodes                        # or use the bundled kubectl
# make it permanent for your user:
mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown $USER ~/.kube/config

# RKE2
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

# MicroK8s
microk8s kubectl get nodes
microk8s config > ~/.kube/config
```

## Fix 3: sudo uses root's config

`sudo kubectl ...` reads `/root/.kube/config`, not yours. Don't use sudo with kubectl, or pass the config explicitly: `sudo kubectl --kubeconfig $HOME/.kube/config get pods`.

## Fix 4: managed / local clusters

Regenerate the kubeconfig entry:

```bash
aws eks update-kubeconfig --region eu-west-1 --name my-cluster
gcloud container clusters get-credentials my-cluster --region europe-west1
az aks get-credentials --resource-group rg --name my-cluster
minikube start          # writes the minikube context
kind create cluster     # writes kind-kind context; or: kind export kubeconfig
```

Docker Desktop: enable Kubernetes in Settings, then `kubectl config use-context docker-desktop`.

## Fix 5: context exists but isn't selected

```bash
kubectl config get-contexts
kubectl config use-context my-cluster
```

## Fix 6: KUBECONFIG points to a missing file

A typo in `~/.bashrc` (`export KUBECONFIG=~/.kube/conf`) makes kubectl ignore your real config. `echo $KUBECONFIG`, fix or `unset KUBECONFIG`.

## If the API server is actually down

If your kubeconfig is fine but the error shows your real API address (e.g. `10.0.0.10:6443 was refused`), the API server isn't running. On kubeadm nodes check:

```bash
sudo systemctl status kubelet
sudo crictl ps -a | grep kube-apiserver
sudo journalctl -u kubelet -n 100
```

Common culprits are swap being enabled after a reboot (`sudo swapoff -a`), an expired certificate (`sudo kubeadm certs check-expiration`) or the container runtime not running.
