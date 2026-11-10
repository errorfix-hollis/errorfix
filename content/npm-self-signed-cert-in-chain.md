---
error: "npm ERR! code SELF_SIGNED_CERT_IN_CHAIN"
error_full: |
  npm ERR! code SELF_SIGNED_CERT_IN_CHAIN
  npm ERR! errno SELF_SIGNED_CERT_IN_CHAIN
  npm ERR! request to https://registry.npmjs.org/express failed, reason: self signed certificate in certificate chain
cat: npm
description: "npm's TLS check found a certificate in the chain that isn't signed by a CA Node trusts. Almost always a corporate proxy or antivirus intercepting HTTPS with its own root certificate."
tldr: "Get your company's root CA certificate (PEM) and trust it: `npm config set cafile /path/to/corp-ca.pem`, or for all Node tools `export NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem`. Avoid `npm config set strict-ssl false` except as a short-lived test."
keywords: npm err code self_signed_cert_in_chain self signed certificate in certificate chain corporate proxy cafile NODE_EXTRA_CA_CERTS strict-ssl zscaler yarn node
related: [web-curl-60-ssl-certificate-problem, npm-err-code-etimedout, python-ssl-certificate-verify-failed]
---
## What it means

When npm connects to `https://registry.npmjs.org`, Node verifies the certificate chain against its built-in list of root CAs. `SELF_SIGNED_CERT_IN_CHAIN` means the chain ends in a root that's not on that list.

The public npm registry uses a normal, publicly trusted certificate, so the cause is almost always something between you and the registry that re-signs traffic:

- a corporate TLS-inspecting proxy (Zscaler, Netskope, Palo Alto, Blue Coat, Fortinet)
- antivirus "HTTPS scanning" (Avast, Kaspersky, ESET)
- a private registry (Nexus, Artifactory, Verdaccio) with an internal CA

Confirm by looking at who issued the certificate you actually receive:

```bash
openssl s_client -connect registry.npmjs.org:443 -servername registry.npmjs.org </dev/null 2>/dev/null | grep -E "^(subject|issuer)"
```

If the issuer is your company or antivirus vendor, that's the interception.

## Fix 1: trust the corporate CA in npm (recommended)

Get the root CA certificate in PEM format from IT, or export it from your OS/browser certificate store (Windows: `certmgr.msc` → Trusted Root → export as Base-64 X.509; macOS: Keychain Access → export `.pem`).

```bash
npm config set cafile /path/to/corp-root-ca.pem
npm install
```

`cafile` replaces npm's CA list for registry requests. If you use multiple CAs, concatenate them into one PEM file.

## Fix 2: trust it for all Node.js tools

npm's `cafile` doesn't cover `node-gyp` downloads, postinstall scripts (e.g. Puppeteer, Cypress, esbuild binaries) or your own code. `NODE_EXTRA_CA_CERTS` *adds* certificates to Node's built-in list:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/corp-root-ca.pem     # add to ~/.bashrc
# Windows (PowerShell, persistent):
setx NODE_EXTRA_CA_CERTS "C:\certs\corp-root-ca.pem"
```

It's read only at process start, so open a new terminal. On Node 22.15+/23.8+ you can also run with `--use-system-ca` (or `NODE_OPTIONS=--use-system-ca`) to trust the OS certificate store directly.

## Fix 3: Yarn and pnpm

```bash
yarn config set cafile /path/to/corp-root-ca.pem          # Yarn 1
yarn config set httpsCaFilePath /path/to/corp-root-ca.pem # Yarn 2+
pnpm config set cafile /path/to/corp-root-ca.pem
```

## Fix 4: Docker builds behind the proxy

Copy the cert into the image before `npm ci`:

```dockerfile
COPY corp-root-ca.pem /usr/local/share/ca-certificates/corp-root-ca.crt
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/corp-root-ca.crt
RUN npm ci
```

## Not recommended: disabling verification

```bash
npm config set strict-ssl false        # npm only
NODE_TLS_REJECT_UNAUTHORIZED=0 npm i  # everything in Node
```

This makes npm accept *any* certificate, so anyone on the network path can serve you malicious packages. Use it only to confirm the diagnosis, then revert with `npm config delete strict-ssl`.

Also check for an old `ca=""` or stale `cafile` in `~/.npmrc` or the project `.npmrc` — `npm config list` shows what's active.
