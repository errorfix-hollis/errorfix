---
error: "x509: certificate signed by unknown authority"
error_full: |
  Get "https://registry.example.com/v2/": x509: certificate signed by unknown authority
  tls: failed to verify certificate: x509: certificate signed by unknown authority
  Error response from daemon: Get "https://myregistry:5000/v2/": x509: certificate signed by unknown authority
cat: web
description: A Go program (docker, kubectl, terraform, helm, gh, your own service) couldn't verify the server's TLS certificate because the CA that issued it isn't in its trust store. Typical with corporate proxies, self-signed certs, private registries and minimal containers.
tldr: "Add the CA certificate to the system trust store: `sudo cp myca.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates` (Debian/Ubuntu). In containers install `ca-certificates`. For a private Docker registry put the CA at `/etc/docker/certs.d/<host:port>/ca.crt`. Don't disable verification except for throwaway testing."
keywords: x509 certificate signed by unknown authority tls failed to verify certificate go docker registry kubectl self-signed corporate proxy ca-certificates update-ca-certificates
related: [web-curl-60-ssl-certificate-problem, python-ssl-certificate-verify-failed, web-net-err-cert-authority-invalid]
---
## What it means

This is Go's TLS error message (used by Docker, Kubernetes tools, Terraform, Helm, Hugo, etc.). The server presented a certificate chain, and none of it led to a root CA the client trusts. Either the certificate is self-signed/private, something in between (proxy, antivirus) is re-signing traffic, or the client has no CA bundle at all.

Look at who issued the certificate:

```bash
openssl s_client -connect registry.example.com:443 -servername registry.example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer
```

If the issuer is your company's name or a security product (Zscaler, Netskope, Fortinet...), it's a TLS-inspecting proxy.

## Fix 1: trust the CA system-wide (Linux)

Get the CA certificate in PEM format (from IT, or the last certificate printed by `openssl s_client -showcerts`).

Debian / Ubuntu:

```bash
sudo cp corp-ca.crt /usr/local/share/ca-certificates/corp-ca.crt   # must end in .crt
sudo update-ca-certificates
```

RHEL / Fedora:

```bash
sudo cp corp-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

Go reads the system store on Linux, so most tools work after this. Restart long-running daemons (e.g. `sudo systemctl restart docker`).

On macOS, add it to the System keychain: `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain corp-ca.crt`.

## Fix 2: Docker private registry

For `docker pull`/`push` to a registry with a private CA, Docker reads per-registry CAs without a restart:

```bash
sudo mkdir -p /etc/docker/certs.d/myregistry:5000
sudo cp ca.crt /etc/docker/certs.d/myregistry:5000/ca.crt
```

The directory name must match the host and port exactly as used in the image name. For a test registry you can instead list it in `/etc/docker/daemon.json` as `"insecure-registries": ["myregistry:5000"]` and restart Docker, but that disables verification.

## Fix 3: minimal containers have no CA bundle

`scratch`, `distroless/static` or slim images without `ca-certificates` fail on every HTTPS call:

```dockerfile
# Debian-based
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
# Alpine
RUN apk add --no-cache ca-certificates
# scratch: copy from a builder stage
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
```

To add a corporate CA in an image, copy it to `/usr/local/share/ca-certificates/` and run `update-ca-certificates` in the Dockerfile.

## Fix 4: point one tool at a CA file

Go honours `SSL_CERT_FILE` and `SSL_CERT_DIR` on Linux:

```bash
SSL_CERT_FILE=/path/to/bundle.pem terraform init
```

kubectl uses the CA in your kubeconfig (`certificate-authority-data`); if the cluster's certificate changed, get a fresh kubeconfig instead of trusting a random CA.

## Fix 5: the server sends an incomplete chain

If browsers work but Go clients fail, the server may be missing the intermediate certificate (browsers often fetch it themselves). Fix it on the server: serve the full chain (e.g. `fullchain.pem` with Let's Encrypt, not `cert.pem`).

## Avoid

`InsecureSkipVerify: true`, `--insecure-skip-tls-verify` and `insecure-registries` turn off verification entirely, which allows man-in-the-middle attacks. Use them only for short local tests.
