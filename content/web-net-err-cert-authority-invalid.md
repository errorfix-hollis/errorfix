---
error: "NET::ERR_CERT_AUTHORITY_INVALID"
error_full: |
  Your connection is not private
  Attackers might be trying to steal your information from localhost (for example, passwords, messages, or credit cards).
  NET::ERR_CERT_AUTHORITY_INVALID
cat: web
description: The browser doesn't trust the certificate authority that signed the site's TLS certificate. Usually it's a self-signed or local development certificate, a server missing its intermediate certificate, or a corporate proxy/antivirus intercepting HTTPS.
tldr: "For your own server, serve the full chain (e.g. Let's Encrypt `fullchain.pem`, not `cert.pem`) and check with `openssl s_client -connect example.com:443 -servername example.com`. For local development, use mkcert: `mkcert -install && mkcert localhost 127.0.0.1` and point your dev server at the generated files. On a corporate network, install the company root CA."
keywords: net err_cert_authority_invalid your connection is not private self-signed certificate localhost mkcert intermediate certificate fullchain chrome edge nginx untrusted root ca corporate proxy antivirus https
related: [python-ssl-certificate-verify-failed, web-err-too-many-redirects, web-nginx-502-bad-gateway]
---
## What it means

A TLS certificate is trusted only if the browser can build a chain from it, through any intermediate certificates, to a root CA in the OS/browser trust store. `ERR_CERT_AUTHORITY_INVALID` means that chain couldn't be built: the issuer is unknown, or the cert is self-signed. (Other errors cover other problems: `ERR_CERT_DATE_INVALID` for expired certs or a wrong clock, `ERR_CERT_COMMON_NAME_INVALID` for a hostname mismatch.)

Click **Advanced** on the error page to see the certificate's issuer, or inspect from a terminal:

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null \
  | grep -E "^(depth|verify| [0-9] s:| *i:)|Verify return code"
```

`Verify return code: 0 (ok)` means OpenSSL trusts it; `21 (unable to verify the first certificate)` usually means a missing intermediate, and `18`/`19` a self-signed cert.

## Cause 1: server doesn't send the intermediate certificate

Some browsers can fetch missing intermediates, others (and most non-browser clients) can't, so the site works for some users and not others. Configure the full chain.

**Let's Encrypt / certbot** with nginx:

```nginx
ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;  # not cert.pem
ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

For a commercial CA, concatenate your certificate followed by the intermediate(s) into one file:

```bash
cat example.com.crt intermediate.crt > fullchain.crt
```

Apache 2.4.8+ also reads the chain from the file in `SSLCertificateFile`.

## Cause 2: self-signed certificate on a server you control

Self-signed certificates are never trusted by browsers. For a public site, get a free trusted certificate:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

## Cause 3: local development (localhost, LAN IPs)

Use mkcert, which creates a local CA, installs it into your system and browser trust stores, and issues certificates from it:

```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1
# creates localhost+2.pem and localhost+2-key.pem
```

Point your dev server at them, e.g. Vite:

```js
// vite.config.js
import fs from 'node:fs';
export default {
  server: {
    https: {
      key: fs.readFileSync('localhost+2-key.pem'),
      cert: fs.readFileSync('localhost+2.pem'),
    },
  },
};
```

Never share mkcert's `rootCA-key.pem` — anyone with it can issue certificates your machine trusts. Firefox uses its own trust store; mkcert installs into it if `certutil` (package `libnss3-tools` on Debian/Ubuntu) is present.

## Cause 4: corporate proxy, VPN or antivirus

TLS-inspecting proxies and antivirus "HTTPS scanning" re-sign every site with their own root CA. If that root isn't installed, *every* HTTPS site shows this error. Get the company root certificate from IT and install it in the OS trust store (Windows: *Trusted Root Certification Authorities*; macOS: Keychain Access → System, set to Always Trust; Linux: copy to `/usr/local/share/ca-certificates/` with a `.crt` extension and run `sudo update-ca-certificates`). For antivirus, disable HTTPS scanning to test.

If it happens on public Wi-Fi on well-known sites, don't click through — something may really be intercepting your traffic.

## Cause 5: private CA for internal services

Internal sites signed by an organisation's own CA need that CA's root installed on each client, as in Cause 4. Distribute it via group policy/MDM rather than asking users to bypass warnings.

## Don't just bypass it

Clicking "Proceed (unsafe)" or typing `thisisunsafe` in Chrome only hides the problem for you; APIs, mobile apps and other users will still fail.
