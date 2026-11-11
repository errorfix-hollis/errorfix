---
error: "x509: certificate is valid for X, not Y"
error_full: |
  Unable to connect to the server: x509: certificate is valid for 10.96.0.1, 172.31.5.10, not 54.210.33.12
  tls: failed to verify certificate: x509: certificate is valid for kubernetes, kubernetes.default, not k8s.example.com
cat: kubernetes
description: "The API server's TLS certificate doesn't list the IP or hostname you used in kubeconfig as a Subject Alternative Name (SAN). Common after connecting via a public IP, load balancer or new DNS name."
tldr: "Either connect using a name/IP that's in the cert (check with `openssl s_client -connect HOST:6443 </dev/null | openssl x509 -noout -ext subjectAltName`), or regenerate the API server cert with the extra SAN: kubeadm `--apiserver-cert-extra-sans`, k3s `--tls-san`, then restart the API server. Don't use `insecure-skip-tls-verify` in production."
keywords: kubernetes kubectl x509 certificate is valid for not subject alternative name san apiserver-cert-extra-sans tls-san k3s kubeadm public ip load balancer tls failed to verify certificate
related: [k8s-x509-certificate-has-expired-or-is-not-yet-valid, k8s-unable-to-connect-to-the-server-dial-tcp-i-o-timeout, web-x509-certificate-signed-by-unknown-authority]
---
## What it means

TLS verification checks two things: that the certificate is signed by a trusted CA, and that the address you connected to appears in the certificate's SAN list. The CA part passed here; the name check failed. The message lists the names the cert *is* valid for, then the one you used (`not ...`).

Typical situations:

- The cluster was built with private IPs and you now connect through a public IP or NAT (cloud VM, home lab port-forward).
- A load balancer or DNS name (`k8s.example.com`) was added in front of the control plane later.
- The node's IP changed after the cert was issued.

See the SANs of the certificate actually served:

```bash
openssl s_client -connect 54.210.33.12:6443 </dev/null 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
```

And check which address your kubeconfig uses:

```bash
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
```

## Fix 1: use an address that is in the certificate

If the cert includes a DNS name or IP you can reach (e.g. through a VPN), point kubeconfig at it:

```bash
kubectl config set-cluster mycluster --server=https://172.31.5.10:6443
```

If only the name is wrong but the IP works, you can keep the IP and override the name used for verification:

```bash
kubectl config set-cluster mycluster --tls-server-name=kubernetes
```

`tls-server-name` (kubectl 1.19+) keeps full verification, unlike skipping TLS.

## Fix 2: kubeadm, add SANs and regenerate the API server cert

On a control-plane node, add the names to the kubeadm config:

```yaml
# kubeadm-config.yaml (ClusterConfiguration)
apiServer:
  certSANs:
    - "54.210.33.12"
    - "k8s.example.com"
```

Then regenerate (back up first):

```bash
sudo mkdir -p /root/pki-backup && sudo cp -a /etc/kubernetes/pki /root/pki-backup/
sudo rm /etc/kubernetes/pki/apiserver.{crt,key}
sudo kubeadm init phase certs apiserver --config kubeadm-config.yaml
```

The kube-apiserver static pod picks up the new cert after a restart; the simplest way is to move its manifest out and back:

```bash
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/ && sleep 20
sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/
```

For a new cluster, pass the SANs up front: `kubeadm init --apiserver-cert-extra-sans=54.210.33.12,k8s.example.com`. Repeat the cert step on every control-plane node.

## Fix 3: k3s / RKE2

Add the SAN to the config and restart; k3s regenerates the serving cert automatically:

```yaml
# /etc/rancher/k3s/config.yaml
tls-san:
  - 54.210.33.12
  - k8s.example.com
```

```bash
sudo systemctl restart k3s
```

(RKE2 uses `/etc/rancher/rke2/config.yaml` and `rke2-server`.)

## Fix 4: managed clusters and minikube

On EKS/GKE/AKS you can't change the API cert; always use the endpoint from `aws eks update-kubeconfig`, `gcloud container clusters get-credentials` or `az aks get-credentials`. For minikube use `minikube start --apiserver-ips=... --apiserver-names=...`.

## Same error outside kubectl

`x509: certificate is valid for ..., not ...` from Docker, Go programs or curl means the same thing for any server: the hostname you use must be in the cert. Fix the cert (e.g. reissue with Let's Encrypt including all names) or connect with the right hostname.

Avoid `insecure-skip-tls-verify: true` in kubeconfig: it disables all certificate checks, not just the name.
