---
error: "Error: unable to verify the first certificate (UNABLE_TO_VERIFY_LEAF_SIGNATURE)"
error_full: |
  Error: unable to verify the first certificate
      at TLSSocket.onConnectSecure (node:_tls_wrap:1674:34)
      at TLSSocket.emit (node:events:519:28) {
    code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
  }
cat: npm
description: "Node.js got a TLS certificate it can't chain to a trusted root. Usually the server doesn't send its intermediate certificate, or a corporate proxy/internal CA signed it and Node doesn't trust that CA."
tldr: "Test with `openssl s_client -connect host:443 -servername host -showcerts`. If you own the server, serve the full chain (`fullchain.pem`, not `cert.pem`). If it's an internal/corporate CA, trust it with `export NODE_EXTRA_CA_CERTS=/path/to/ca.pem` (or `npm config set cafile /path/to/ca.pem` for npm). Don't use `NODE_TLS_REJECT_UNAUTHORIZED=0` outside quick local tests."
keywords: node unable_to_verify_leaf_signature unable to verify the first certificate intermediate certificate missing chain fullchain node_extra_ca_certs corporate proxy npm cafile axios https tls
related: [node-unable-to-get-issuer-cert-locally, npm-self-signed-cert-in-chain, node-cert-has-expired]
---
## What it means

To trust a server certificate, Node must build a chain: server (leaf) cert → intermediate CA → root CA it trusts. `UNABLE_TO_VERIFY_LEAF_SIGNATURE` means it couldn't verify the leaf's signature because the issuing certificate is missing or unknown.

Browsers often hide this problem: they cache intermediates and fetch missing ones automatically (AIA fetching). Node does not, so a site that "works in Chrome" can still fail in Node, `axios`, `fetch`, or npm.

Diagnose:

```bash
openssl s_client -connect api.example.com:443 -servername api.example.com -showcerts </dev/null
```

Look at `Certificate chain`. If only `0 s:CN=api.example.com` appears with no `1 s:` intermediate, the server is sending an incomplete chain. `Verify return code: 21 (unable to verify the first certificate)` confirms it.

## Fix 1: the server is missing its intermediate (you control the server)

Serve the full chain. With Let's Encrypt / certbot:

```nginx
ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;   # not cert.pem
ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
```

For a commercial CA, concatenate leaf + intermediate(s) in that order:

```bash
cat server.crt intermediate.crt > fullchain.crt
```

Apache 2.4.8+: put the chain in `SSLCertificateFile`. Node HTTPS servers: pass the chain in `cert`, or the intermediate in `ca`. Reload and re-run the `openssl` check.

## Fix 2: corporate proxy or internal CA

Proxies like Zscaler, Netskope or Fortinet re-sign HTTPS traffic with their own CA. Get that CA's certificate (PEM) from IT or export it from your OS/browser certificate store, then tell Node to trust it **in addition** to the built-in roots:

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/corp-root.pem
node app.js
```

It must be set before Node starts (not via `process.env` inside the app). For npm:

```bash
npm config set cafile /etc/ssl/certs/corp-root.pem
```

Node 23.8+/22.15+ can also use the OS certificate store: `node --use-system-ca app.js`.

## Fix 3: third-party server with a broken chain (you don't control it)

Report it to the owner. Meanwhile, download the missing intermediate (its URL is in the leaf cert's "Authority Information Access" field) and pass it as `ca` for that host only:

```js
import https from "node:https";
import fs from "node:fs";
import tls from "node:tls";

const agent = new https.Agent({
  ca: [...tls.rootCertificates, fs.readFileSync("intermediate.pem")],
});
// axios.get(url, { httpsAgent: agent })
```

Or simply add it via `NODE_EXTRA_CA_CERTS`.

## Fix 4: old Node.js version

Very old Node releases ship an outdated CA bundle. Upgrade to a current LTS (`nvm install --lts`).

## What not to do

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 node app.js     # disables ALL certificate checks
```

and `rejectUnauthorized: false` / `npm config set strict-ssl false` make you vulnerable to man-in-the-middle attacks. Use them only for a one-off local test, never in production.
