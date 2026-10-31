---
error: "curl: (60) SSL certificate problem: unable to get local issuer certificate"
error_full: |
  curl: (60) SSL certificate problem: unable to get local issuer certificate
  More details here: https://curl.se/docs/sslcerts.html

  curl failed to verify the legitimacy of the server and therefore could not
  establish a secure connection to it.
  curl: (60) SSL certificate problem: self-signed certificate in certificate chain
cat: web
description: curl couldn't build a trusted chain from the server's certificate to a CA in its CA bundle. Either the bundle is missing/outdated, the server doesn't send its intermediate certificate, or a corporate proxy or self-signed cert is in the way.
tldr: "Update the CA store (`sudo apt install --reinstall ca-certificates && sudo update-ca-certificates`). For an internal/corporate CA, add it: copy the `.crt` to `/usr/local/share/ca-certificates/` and run `sudo update-ca-certificates`, or use `curl --cacert ca.pem`. If you run the server, serve the full chain (fullchain.pem). Use `-k` only for quick tests."
keywords: curl 60 ssl certificate problem unable to get local issuer certificate self-signed certificate in certificate chain ca-certificates update-ca-certificates cacert fullchain intermediate corporate proxy
related: [web-net-err-cert-authority-invalid, python-ssl-certificate-verify-failed, git-could-not-read-from-remote-repository]
---
## What it means

During the TLS handshake the server sends its certificate (and should send intermediates). curl must link that chain to a root CA it trusts, from its CA bundle (on Debian/Ubuntu `/etc/ssl/certs/ca-certificates.crt`). "Unable to get local issuer certificate" means it couldn't find the issuer locally. "Self-signed certificate in certificate chain" means the chain ends at a root it doesn't trust — typical of corporate TLS-inspecting proxies.

Inspect what the server sends:

```bash
openssl s_client -connect example.com:443 -servername example.com -showcerts </dev/null
curl -v https://example.com 2>&1 | grep -iE "issuer|CAfile|subject"
```

## Fix 1: install or update the CA bundle

Minimal Docker images often have no CA certificates at all.

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install --reinstall ca-certificates
sudo update-ca-certificates
# Alpine
apk add --no-cache ca-certificates
# RHEL/Fedora
sudo dnf reinstall ca-certificates && sudo update-ca-trust
```

In a Dockerfile: `RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates`.

## Fix 2: trust your company's or internal CA

Get the root CA certificate (PEM format, from IT or exported from your browser) and add it system-wide:

```bash
# Debian/Ubuntu: file must end in .crt
sudo cp corp-root-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# RHEL/Fedora
sudo cp corp-root-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

Or just for one command:

```bash
curl --cacert corp-root-ca.crt https://internal.example.com
export CURL_CA_BUNDLE=/path/to/bundle.pem
```

Note: Python `requests`, Node.js and Java use their own stores; set `REQUESTS_CA_BUNDLE`, `NODE_EXTRA_CA_CERTS` or import into the Java keystore respectively.

## Fix 3: the server is missing its intermediate certificate

If you run the server and browsers work but curl doesn't, you're probably serving only the leaf certificate (browsers can fetch missing intermediates; curl can't). With `openssl s_client` you'll see only one certificate (depth 0). Serve the full chain:

```nginx
ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;   # not cert.pem
ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
```

Then `sudo nginx -t && sudo systemctl reload nginx`. For Apache 2.4.8+, point `SSLCertificateFile` at the full chain file.

## Fix 4: Windows / Git Bash

curl on Windows may use its own bundle. Let it use the Windows certificate store with `--ca-native` (curl 8.2+). For Git: `git config --global http.sslBackend schannel`.

## Fix 5: wrong system clock

If the clock is far off, valid certificates appear "not yet valid" or expired, sometimes surfacing as chain errors. Check `date` and enable NTP: `sudo timedatectl set-ntp true`.

## About -k / --insecure

`curl -k` disables verification entirely — anyone in the middle can read and modify the traffic. Fine for a one-off check against your own test server, never in scripts or production.
