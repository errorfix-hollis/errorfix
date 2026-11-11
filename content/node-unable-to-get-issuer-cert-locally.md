---
error: "Error: unable to get local issuer certificate (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)"
error_full: |
  npm ERR! code UNABLE_TO_GET_ISSUER_CERT_LOCALLY
  npm ERR! request to https://registry.npmjs.org/react failed, reason: unable to get local issuer certificate
  Error: unable to get local issuer certificate
      at TLSSocket.onConnectSecure (node:_tls_wrap:1659:34) {
    code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
  }
cat: npm
description: "Node.js could not build a trust chain for the server's TLS certificate because the issuing CA is not in Node's CA store. Almost always a corporate proxy or antivirus that re-signs HTTPS traffic with its own root certificate."
tldr: "Get your company's root CA as a PEM file and point Node at it: `export NODE_EXTRA_CA_CERTS=/path/corp-ca.pem` (npm also accepts `npm config set cafile /path/corp-ca.pem`). On recent Node versions you can use the OS store with `NODE_OPTIONS=--use-system-ca`. Don't use `NODE_TLS_REJECT_UNAUTHORIZED=0` except for a quick test."
keywords: node npm unable_to_get_issuer_cert_locally unable to get local issuer certificate node_extra_ca_certs cafile corporate proxy zscaler ssl tls yarn fetch axios
related: [npm-self-signed-cert-in-chain, web-curl-60-ssl-certificate-problem, python-ssl-certificate-verify-failed]
---
## What it means

During the TLS handshake the server sends its certificate and (usually) intermediates. Node has to link them to a root CA it trusts. Node ships its own bundled Mozilla CA list and by default **ignores the operating system's certificate store**. If the chain ends at a CA Node doesn't know, you get `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`.

Common reasons:

1. A corporate proxy / firewall / antivirus (Zscaler, Netskope, Palo Alto, Kaspersky, Avast...) intercepts HTTPS and re-signs it with a company root CA. Your browser trusts it (installed in the OS store), Node doesn't.
2. An internal server or private registry uses a certificate from an internal CA.
3. The server is misconfigured and doesn't send its intermediate certificate.

Check who issued the certificate you actually receive:

```bash
openssl s_client -connect registry.npmjs.org:443 -servername registry.npmjs.org </dev/null 2>/dev/null | grep -E 'subject=|issuer='
```

If the issuer is your company or security product rather than a public CA, it's cause 1.

## Fix 1: add the CA with NODE_EXTRA_CA_CERTS (recommended)

Export the root CA (ask IT, or export it from the browser's certificate viewer as Base64/PEM) and tell Node to trust it **in addition** to the bundled list:

```bash
export NODE_EXTRA_CA_CERTS="$HOME/certs/corp-root-ca.pem"
```

Add it to `~/.bashrc`/`~/.zshrc`, or on Windows:

```powershell
setx NODE_EXTRA_CA_CERTS "C:\certs\corp-root-ca.pem"
```

This works for npm, yarn, pnpm, and any Node program (fetch, axios, Prisma downloads, Angular CLI). It is read only at process start, so open a new terminal.

## Fix 2: npm's cafile setting

For npm only:

```bash
npm config set cafile "$HOME/certs/corp-root-ca.pem"
```

Note: `cafile` *replaces* npm's CA list rather than extending it, so the file should contain every CA you need (for a proxy that re-signs everything, the corporate root is enough). Yarn classic uses `yarn config set cafile ...`; Yarn Berry uses `httpsCaFilePath` in `.yarnrc.yml`.

## Fix 3: use the operating system's store

Newer Node versions can trust the system store, where IT has usually installed the corporate CA already:

```bash
node --use-system-ca app.js
export NODE_OPTIONS=--use-system-ca      # for npm and other tools
```

`--use-system-ca` exists only in recent releases (added in 23.8 / 22.15; Linux support arrived later than Windows/macOS). Check with `node --help | grep system-ca`; if it's missing, use Fix 1. On Linux you can point at the system bundle directly:

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
```

## Fix 4: server missing its intermediate

If you control the server and `openssl s_client` shows `verify error:num=20:unable to get local issuer certificate` from everywhere, configure it to send the full chain (e.g. nginx `ssl_certificate` should point to `fullchain.pem`, not `cert.pem`).

## What not to do

```bash
npm config set strict-ssl false
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

Both disable certificate checking entirely, so any man-in-the-middle can tamper with downloaded packages. Use them only to confirm the diagnosis, then switch to Fix 1.

In Docker builds behind a proxy, copy the CA into the image and set the variable:

```dockerfile
COPY corp-root-ca.pem /usr/local/share/ca-certificates/corp-root-ca.crt
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/corp-root-ca.crt
```
