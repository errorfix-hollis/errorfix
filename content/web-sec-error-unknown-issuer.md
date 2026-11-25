---
error: "SEC_ERROR_UNKNOWN_ISSUER"
error_full: |
  Warning: Potential Security Risk Ahead
  Someone could be trying to impersonate the site and you should not continue.
  example.com uses an invalid security certificate.
  The certificate is not trusted because the issuer certificate is unknown.
  The server might not be sending the appropriate intermediate certificates.
  Error code: SEC_ERROR_UNKNOWN_ISSUER
cat: web
description: "Firefox can't build a trust chain from the site's certificate to a trusted root CA. On your own server it's usually a missing intermediate certificate; as a visitor it's usually antivirus HTTPS scanning, a corporate proxy or a self-signed/local CA that Firefox doesn't trust."
tldr: "Site owners: serve the full chain (nginx `ssl_certificate /etc/letsencrypt/live/site/fullchain.pem;`, not cert.pem) and test with `openssl s_client -connect site:443 -servername site`. Visitors: if it happens on every HTTPS site, disable your antivirus' HTTPS/SSL scanning or set `security.enterprise_roots.enabled` to true in about:config so Firefox trusts the Windows/macOS store. For a local dev CA, import it in Settings → Certificates → Authorities or use `mkcert -install`."
keywords: firefox sec_error_unknown_issuer potential security risk ahead issuer certificate is unknown intermediate certificate fullchain.pem antivirus https scanning security.enterprise_roots.enabled mkcert self-signed corporate proxy
related: [web-net-err-cert-authority-invalid, web-curl-60-ssl-certificate-problem, web-err-cert-common-name-invalid]
---
## What it means

Firefox uses its own trust store (NSS), separate from the operating system's. A certificate is trusted only if Firefox can chain it, via intermediates, to a root it knows. `SEC_ERROR_UNKNOWN_ISSUER` means that chain is broken somewhere.

Chrome's equivalent is `NET::ERR_CERT_AUTHORITY_INVALID`. Note that Chrome sometimes still works when Firefox fails: Chrome can fetch missing intermediates (AIA fetching) and caches them, Firefox mostly doesn't.

First decide: **one site** or **every HTTPS site**?

## Cause 1 (site owner): missing intermediate certificate

The server sends only the leaf certificate. Check:

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | grep -E '^ [0-9] s:|^ +i:|Verify return'
```

If you see only `0 s:` and `verify error:num=20:unable to get local issuer certificate`, the chain is incomplete.

**nginx** (Let's Encrypt/certbot):

```nginx
ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;  # not cert.pem
ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
```

For a commercial CA, concatenate leaf first, then intermediates:

```bash
cat example.com.crt intermediate.crt > fullchain.crt
```

**Apache 2.4.8+**: put the full chain in `SSLCertificateFile`. **Node.js**: pass the full chain as `cert`, or add `ca: [intermediate]`.

Reload (`sudo nginx -t && sudo systemctl reload nginx`) and re-test, or use an online SSL checker.

## Cause 2 (site owner): self-signed or private CA

Public visitors will always get this error. Use a public CA such as Let's Encrypt:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

## Cause 3 (visitor): antivirus or security software intercepting HTTPS

If **every** site fails, and the certificate viewer (click *Advanced → View Certificate*) shows an issuer like Avast, Kaspersky, ESET, Bitdefender, or your company's proxy, that software is re-signing traffic with its own root.

- Turn off "HTTPS scanning" / "SSL scanning" / "Web Shield" in the antivirus, or
- Let Firefox trust roots from the OS store: open `about:config`, set `security.enterprise_roots.enabled` to `true`, restart Firefox.

On company laptops the proxy CA is normally installed by IT; the enterprise roots setting makes Firefox use it.

## Cause 4 (developer): local HTTPS with a dev CA

For `https://localhost` with a custom CA, import the CA into Firefox: *Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import*, tick *Trust this CA to identify websites*.

With mkcert, install the CA into Firefox's store too (needs `certutil`: `sudo apt install libnss3-tools`):

```bash
mkcert -install
mkcert localhost 127.0.0.1
```

## Cause 5: wrong system clock

A clock far in the past/future can make valid intermediates look invalid. Fix the date and time (enable automatic time sync), then reload.

## Should I click "Accept the Risk"?

Only for your own test servers. On public sites, banking or login pages, don't: the warning exists to stop interception.
