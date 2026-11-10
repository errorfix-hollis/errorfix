---
error: "Unable to connect to the server: dial tcp: i/o timeout"
error_full: |
  Unable to connect to the server: dial tcp 10.0.12.34:6443: i/o timeout
  E1110 09:12:03.123456   4321 memcache.go:265] couldn't get current server API group list: Get "https://10.0.12.34:6443/api?timeout=32s": dial tcp 10.0.12.34:6443: i/o timeout
cat: kubernetes
description: "kubectl sent a TCP connection to the API server address in your kubeconfig and got no answer. The cluster is down, the address is unreachable from your network (VPN, private endpoint, firewall), or your kubeconfig points at the wrong cluster."
tldr: "Check `kubectl config current-context` and the server URL (`kubectl config view --minify`). Test the port with `nc -vz <host> 6443`. Connect the VPN or bastion, add your IP to the cluster's authorized networks, start the local cluster (`minikube start`), or refresh the kubeconfig (`aws eks update-kubeconfig ...` / `gcloud container clusters get-credentials ...`)."
keywords: kubectl unable to connect to the server dial tcp i/o timeout 6443 443 api server kubeconfig context vpn private endpoint eks gke aks authorized networks minikube proxy
related: [k8s-connection-to-the-server-localhost-8080-was-refused, k8s-you-must-be-logged-in-to-the-server-unauthorized, k8s-x509-certificate-has-expired-or-is-not-yet-valid]
---
## What it means

`i/o timeout` is a network-level failure: kubectl's TCP connection attempt got **no response** (packets silently dropped), unlike `connection refused` where the host actively rejects it. Authentication never happened.

Start by checking what kubectl is trying to reach:

```bash
kubectl config current-context
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'; echo
nc -vz -w 5 10.0.12.34 6443       # or: curl -k https://10.0.12.34:6443/version
```

If `nc` also times out, it's networking, not kubectl.

## Cause 1: wrong context or stale kubeconfig

You might be pointing at an old or deleted cluster, or a cluster whose IP changed after recreation.

```bash
kubectl config get-contexts
kubectl config use-context the-right-one
```

Regenerate credentials for managed clusters:

```bash
aws eks update-kubeconfig --region eu-west-1 --name my-cluster
gcloud container clusters get-credentials my-cluster --region europe-west1
az aks get-credentials --resource-group rg --name my-cluster
```

Also check `KUBECONFIG` isn't set to a different file: `echo $KUBECONFIG`.

## Cause 2: private API endpoint / VPN

A private IP like `10.x`, `172.16-31.x` or `192.168.x` is only reachable from inside the cluster's network. Connect the VPN, use a bastion host, or tunnel:

```bash
ssh -L 6443:10.0.12.34:6443 user@bastion
# then point the kubeconfig server at https://127.0.0.1:6443 (TLS name must match, or use tls-server-name)
```

- **EKS**: if only the private endpoint is enabled, you need network access to the VPC. Check with `aws eks describe-cluster --name my-cluster --query cluster.resourcesVpcConfig`.
- **GKE**: private clusters need you to be in the VPC or on the authorized networks.
- **AKS**: private clusters resolve through a private DNS zone; use `az aks command invoke` as a fallback.

## Cause 3: your IP isn't allowed

Public endpoints often restrict source IPs. If your IP changed (new Wi-Fi, home vs office), you'll time out:

```bash
curl -s https://ifconfig.me
# EKS
aws eks update-cluster-config --name my-cluster --resources-vpc-config publicAccessCidrs="203.0.113.7/32"
# GKE
gcloud container clusters update my-cluster --enable-master-authorized-networks --master-authorized-networks 203.0.113.7/32
# AKS
az aks update -g rg -n my-cluster --api-server-authorized-ip-ranges 203.0.113.7/32
```

For self-managed clusters, check cloud security groups and host firewalls allow TCP 6443 from your machine.

## Cause 4: the cluster or control plane is down

- **minikube**: `minikube status`, then `minikube start`. After a restart the IP may change; `minikube update-context` fixes kubeconfig.
- **kind / k3d / Docker Desktop**: make sure Docker is running and the cluster container is up (`docker ps`).
- **kubeadm**: on the control-plane node, check `sudo systemctl status kubelet` and `sudo crictl ps | grep kube-apiserver`. An expired certificate or full disk can stop the API server.
- **Stopped cloud VMs** or a scaled-to-zero cluster also look exactly like this.

## Cause 5: proxy settings

If `HTTPS_PROXY` is set, kubectl sends traffic through the proxy, which may not reach internal addresses:

```bash
env | grep -i proxy
export NO_PROXY=$NO_PROXY,10.0.12.34,.internal.example.com
```

Or set `proxy-url` per cluster in kubeconfig instead of a global environment variable.

## If it's intermittent

Occasional timeouts on large clusters can be API server overload; check API server metrics and raise the timeout for a single request with `kubectl --request-timeout=60s get pods`.
