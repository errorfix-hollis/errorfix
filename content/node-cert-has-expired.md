---
error: "Error: certificate has expired (CERT_HAS_EXPIRED)"
error_full: |
  Error: certificate has expired
      at TLSSocket.onConnectSecure (node:_tls_wrap:1674:34)
      at TLSSocket.emit (node:events:519:28) {
    code: 'CERT_HAS_EXPIRED'
  }
  npm ERR! code CERT_HAS_EXPIRED
  npm ERR! errno CERT_HAS_EXPIRED
  npm ERR! request to https://registry.npmjs.org/... failed, reason: certificate has expired
cat: javascript
description: "Node's TLS check found a certificate in the server's chain whose validity period has ended, or your system clock is wrong. Common causes: a wrong date, a server with an expired cert, an outdated CA store or an old intercepting proxy cert."
tldr: "First check your clock: `date` (fix with `sudo timedatectl set-ntp true`). Then inspect the server's cert: `openssl s_client -connect host:443 -servername host </dev/null | openssl x509 -noout -dates`. Update Node/npm and system CA certificates (`sudo apt install --reinstall ca-certificates`). If a corporate proxy re-signs traffic, point `NODE_EXTRA_CA_CERTS` to its current CA. Don't leave `strict-ssl=false` or `NODE_TLS_REJECT_UNAUTHORIZED=0` on."
keywords: node npm error certificate has expired cert_has_expired tls https registry.npmjs.org expired ssl certificate system clock ca-certificates node_extra_ca_certs strict-ssl yarn axios fetch
related: [node-unable-to-get-issuer-cert-locally, npm-self-signed-cert-in-chain, web-curl-60-ssl-certificate-problem]
---
## What it means

During the TLS handshake Node verified each certificate in the server's chain against the current time. One of them has a `notAfter` date in the past (according to **your** clock). Node refuses the connection with `CERT_HAS_EXPIRED`. It appears from `npm install`, `yarn`, `fetch`, `axios`, `https.get`, etc.

Find out which side is wrong.

## Cause 1: your system clock is wrong

A clock set years ahead (or a VM/container restored from a snapshot, a dead CMOS battery) makes valid certs look expired.

```bash
date
timedatectl status          # Linux
```

Fix:

```bash
sudo timedatectl set-ntp true      # Linux with systemd
```

On Windows: *Settings → Time & language → Set time automatically → Sync now*. In WSL, `sudo hwclock -s` re-syncs after the host sleeps.

## Cause 2: the server's certificate really expired

Check what the server sends:

```bash
openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

If `notAfter` is in the past, the server owner must renew it (e.g. `sudo certbot renew` for Let's Encrypt, then reload nginx/Apache). You can't fix this from the client side safely. Also make sure the server sends the **current** intermediate certificate, not an old expired one bundled in its chain file.

## Cause 3: old CA store / old Node

An expired **root** in an outdated trust store causes this even when the server is fine. The classic case: Let's Encrypt's old *DST Root CA X3* expired on 30 Sep 2021, breaking Node < 16 / old OpenSSL with servers that served the cross-signed chain.

- Update Node to a current LTS (it bundles its own up-to-date Mozilla CA list): `nvm install --lts`.
- Update the OS store, used by curl, git and by Node when started with `--use-openssl-ca`:

```bash
sudo apt update && sudo apt install --reinstall ca-certificates && sudo update-ca-certificates   # Debian/Ubuntu
sudo dnf update ca-certificates                                                                 # Fedora/RHEL
```

- In old Docker images, rebuild from a newer base (`node:22-slim`), or add `RUN apt-get update && apt-get install -y ca-certificates`.

## Cause 4: corporate proxy / antivirus with an expired CA

Proxies like Zscaler, Netskope or antivirus HTTPS scanning re-sign traffic with their own CA. If you exported that CA long ago and it was rotated, Node sees an expired cert. Get the current CA from IT (or export it from your browser), then:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem
npm config set cafile /path/to/corp-ca.pem
```

Remove any stale `cafile` or `ca` lines from `~/.npmrc` that point to an old file:

```bash
npm config get cafile
npm config delete cafile
```

## Cause 5: an old npm registry URL / mirror

Very old npm versions or `.npmrc` files pointing at a private mirror with an expired cert. Check `npm config get registry` and update npm itself: `npm install -g npm@latest`.

## What not to do

```bash
npm config set strict-ssl false
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

These disable certificate checking entirely, making man-in-the-middle attacks trivial. Use them only for a one-off diagnosis, then undo (`npm config delete strict-ssl`).
