---
error: "SSL certificate problem: unable to get local issuer certificate"
error_full: |
  fatal: unable to access 'https://github.com/user/repo.git/': SSL certificate problem: unable to get local issuer certificate
  fatal: unable to access 'https://gitlab.company.com/group/repo.git/': SSL certificate problem: self signed certificate in certificate chain
cat: git
description: "Git (via curl/OpenSSL or Schannel) couldn't verify the server's HTTPS certificate against the CA certificates it trusts. Almost always a corporate proxy/antivirus that re-signs TLS, a self-hosted server with a private CA, or an outdated CA bundle."
tldr: "On Windows switch Git to the system certificate store: `git config --global http.sslBackend schannel`. Elsewhere, add your company/root CA: `git config --global http.sslCAInfo /path/to/company-ca.pem` (or per host with `http.https://git.company.com/.sslCAInfo`). Update CA certificates (`sudo apt install --reinstall ca-certificates`). Don't disable verification globally."
keywords: git ssl certificate problem unable to get local issuer certificate self signed certificate in certificate chain http.sslcainfo sslbackend schannel corporate proxy zscaler ca bundle clone push
related: [web-curl-60-ssl-certificate-problem, git-could-not-resolve-proxy, node-unable-to-get-issuer-cert-locally]
---
## What it means

When you clone, fetch or push over HTTPS, Git checks that the server's certificate chain leads to a trusted root CA. "Unable to get local issuer certificate" means it couldn't find the issuer of the presented certificate in its CA bundle. The certificate isn't necessarily bad — your Git just doesn't trust whoever signed it.

See what certificate you're actually getting:

```bash
openssl s_client -connect github.com:443 -servername github.com </dev/null 2>/dev/null | openssl x509 -noout -issuer -subject
```

If the issuer is your company, Zscaler, Netskope, Fortinet, or an antivirus (Avast, Kaspersky...) instead of a public CA, the traffic is being intercepted and re-signed.

## Fix 1: Windows — use the Windows certificate store

Git for Windows ships its own CA bundle that doesn't include CAs your IT department pushed into Windows. Tell Git to use Schannel, which reads the Windows store:

```bash
git config --global http.sslBackend schannel
```

This fixes most corporate laptops immediately. (On macOS, Homebrew/Apple Git use their own bundles — use Fix 2.)

## Fix 2: trust your company or private CA

Get the root CA certificate (PEM, `-----BEGIN CERTIFICATE-----`) from IT, or export it from your browser's certificate viewer. Then point Git at it.

Only for one server (recommended):

```bash
git config --global http."https://git.company.com/".sslCAInfo /home/me/certs/company-ca.pem
```

For all hosts, combine it with the normal bundle so public sites still work:

```bash
cat /etc/ssl/certs/ca-certificates.crt ~/certs/company-ca.pem > ~/certs/git-bundle.pem
git config --global http.sslCAInfo ~/certs/git-bundle.pem
```

Or add it to the system store (Debian/Ubuntu), which Git uses by default on Linux:

```bash
sudo cp company-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

On RHEL/Fedora: copy to `/etc/pki/ca-trust/source/anchors/` and run `sudo update-ca-trust`.

## Fix 3: the CA bundle is missing or outdated

Minimal Docker images and old systems may have no CA certificates at all:

```bash
sudo apt-get install --reinstall ca-certificates   # Debian/Ubuntu
apk add ca-certificates                             # Alpine
```

Also check whether something already overrides the path with a wrong file:

```bash
git config --show-origin --get-all http.sslCAInfo
echo $GIT_SSL_CAINFO $SSL_CERT_FILE
```

Upgrading Git for Windows also refreshes its bundled certificates.

## Fix 4: self-hosted server with an incomplete chain

If everyone gets the error for your own GitLab/Gitea/Bitbucket server, the server probably sends only its leaf certificate without the intermediate. Configure the web server with the full chain (e.g. nginx `ssl_certificate` pointing to `fullchain.pem`, not `cert.pem`).

## About disabling verification

`git config --global http.sslVerify false` makes the error go away by accepting any certificate, including an attacker's. If you must use it temporarily, limit it to one command and one host:

```bash
git -c http.sslVerify=false clone https://git.company.com/group/repo.git
```

Or use SSH remotes (`git@github.com:user/repo.git`), which don't depend on HTTPS certificates at all.
