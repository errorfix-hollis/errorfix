---
error: "x509: certificate has expired or is not yet valid"
error_full: |
  Unable to connect to the server: x509: certificate has expired or is not yet valid: current time 2026-11-07T10:12:03Z is after 2026-10-30T08:41:55Z
  E1107 10:12:03.512 memcache.go:265] couldn't get current server API group list: Get "https://10.0.0.10:6443/api?timeout=32s": tls: failed to verify certificate: x509: certificate has expired or is not yet valid
cat: kubernetes
description: "A TLS certificate in the chain is outside its validity period. On kubeadm clusters this is usually the control-plane certificates (valid 1 year) or the admin kubeconfig expiring; it can also be a wrong system clock."
tldr: "Check the clock first (`date`, `timedatectl`). On kubeadm control-plane nodes: `sudo kubeadm certs check-expiration`, then `sudo kubeadm certs renew all`, restart the static pods (move manifests out of /etc/kubernetes/manifests and back, or restart kubelet) and copy the new `/etc/kubernetes/admin.conf` to `~/.kube/config`."
keywords: kubernetes kubectl x509 certificate has expired or is not yet valid kubeadm certs renew all check-expiration admin.conf apiserver certificate expired 1 year kubelet client certificate rotation clock skew
related: [k8s-you-must-be-logged-in-to-the-server-unauthorized, k8s-connection-to-the-server-localhost-8080-was-refused, web-x509-certificate-signed-by-unknown-authority]
---
## What it means

Every certificate has `notBefore` and `notAfter` dates. The error appears when the current time (as the client sees it) is outside that window. The message usually tells you which: "current time ... is after ..." means expired, "is before ..." means not yet valid (clock behind).

kubeadm creates control-plane certificates valid for **1 year** (the CA for 10). They are renewed automatically only when you run `kubeadm upgrade`, so clusters that are never upgraded break after a year.

## Step 1: check the clock

```bash
date -u
timedatectl status          # "System clock synchronized: yes"?
sudo timedatectl set-ntp true
```

A VM resumed from a snapshot, or a machine without NTP, can be far off. Fix the time on both your workstation and the nodes before renewing anything.

## Step 2: see which certificate expired

On a control-plane node:

```bash
sudo kubeadm certs check-expiration
```

For an arbitrary endpoint or file:

```bash
echo | openssl s_client -connect 10.0.0.10:6443 2>/dev/null | openssl x509 -noout -dates
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -enddate
```

Your kubeconfig embeds a client certificate as base64 (`client-certificate-data`); decode it to check:

```bash
grep client-certificate-data ~/.kube/config | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate
```

(The [Base64 tool](/tools/base64-encode-decode/) and [timestamp converter](/tools/unix-timestamp-converter/) help when inspecting by hand.)

## Fix 1: renew kubeadm certificates

On **each** control-plane node:

```bash
sudo cp -r /etc/kubernetes /root/kubernetes-backup-$(date +%F)
sudo kubeadm certs renew all
```

The running components don't pick up new certs until restarted. Restart the static pods (apiserver, controller-manager, scheduler, etcd):

```bash
sudo mkdir -p /tmp/manifests
sudo mv /etc/kubernetes/manifests/*.yaml /tmp/manifests/
sleep 20
sudo mv /tmp/manifests/*.yaml /etc/kubernetes/manifests/
```

Then refresh your kubeconfig, because `admin.conf` was regenerated:

```bash
mkdir -p ~/.kube
sudo cp /etc/kubernetes/admin.conf ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
kubectl get nodes
```

Copy the new admin kubeconfig to any other machines that used the old one.

## Fix 2: kubelet client certificates

If nodes show `NotReady` and kubelet logs mention an expired certificate, check `/var/lib/kubelet/pki/kubelet-client-current.pem`. Kubelet rotates it automatically when `rotateCertificates: true` (the kubeadm default), so this usually only happens when a node was off for a long time. If it already expired, generate a fresh kubeconfig for that node on a control-plane node:

```bash
NODE=worker-1
sudo kubeadm kubeconfig user --org system:nodes --client-name system:node:$NODE > kubelet-$NODE.conf
```

Copy it to the node as `/etc/kubernetes/kubelet.conf`, remove the expired `/var/lib/kubelet/pki/kubelet-client-*` files and run `sudo systemctl restart kubelet`. Rejoining the node with `kubeadm join` also works.

## Fix 3: managed clusters and other distros

- **EKS/GKE/AKS**: control-plane certs are managed for you; the expired thing is usually a stale kubeconfig or an old auth plugin. Regenerate it: `aws eks update-kubeconfig --name <cluster>`, `gcloud container clusters get-credentials <cluster>`, `az aks get-credentials -g <rg> -n <cluster>`.
- **k3s**: certificates are renewed when k3s restarts within 90 days of expiry: `sudo systemctl restart k3s`. Newer versions also have `k3s certificate rotate`.
- **minikube**: `minikube delete && minikube start` is the quickest fix for a local cluster.
- **Webhooks / ingress / cert-manager**: an expired certificate on an admission webhook or Ingress gives the same x509 text in pod events or API errors. Check `kubectl get certificates -A` and renew the Secret.

## Prevent it

Upgrade kubeadm clusters at least once a year (`kubeadm upgrade apply` renews certs), or schedule `kubeadm certs renew all` plus a control-plane restart, and monitor `kubeadm certs check-expiration`.
