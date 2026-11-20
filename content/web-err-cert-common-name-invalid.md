---
error: "NET::ERR_CERT_COMMON_NAME_INVALID"
error_full: |
  Your connection is not private
  Attackers might be trying to steal your information from www.example.com (for example, passwords, messages, or credit cards).
  NET::ERR_CERT_COMMON_NAME_INVALID
cat: web
description: "The site's TLS certificate is valid, but not for the hostname in the address bar: the domain (e.g. `www.` vs bare domain, a subdomain, or an IP) isn't listed in the certificate's Subject Alternative Names."
tldr: "Check which names the cert covers: `openssl s_client -connect example.com:443 -servername example.com </dev/null | openssl x509 -noout -ext subjectAltName`. Reissue it with every hostname you serve, e.g. `sudo certbot --nginx -d example.com -d www.example.com`, or make sure the right server block/vhost answers for that name. Self-signed certs need a SAN, not just a CN."
keywords: net err_cert_common_name_invalid your connection is not private certificate subject alternative name san www hostname mismatch certbot nginx self-signed chrome ssl_error_bad_cert_domain
related: [web-net-err-cert-authority-invalid, web-err-ssl-protocol-error, web-curl-60-ssl-certificate-problem]
---
## What it means

A certificate lists the hostnames it's valid for in the **Subject Alternative Name** (SAN) extension. Chrome (and Edge) compare that list with the hostname you visited. If it isn't there, you get `ERR_CERT_COMMON_NAME_INVALID`. Firefox calls it `SSL_ERROR_BAD_CERT_DOMAIN`; curl says `no alternative certificate subject name matches target host name`.

Since Chrome 58, the old Common Name (CN) field is **ignored** — only SANs count.

See what the server sends:

```bash
openssl s_client -connect www.example.com:443 -servername www.example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -ext subjectAltName
```

In Chrome: click "Not secure" → *Certificate is not valid* → *Details* → *Subject Alternative Name*.

## Cause 1: www vs non-www (or a missing subdomain)

The certificate covers `example.com` but you visited `www.example.com`, or the other way round. Reissue with all names. With Certbot:

```bash
sudo certbot --nginx -d example.com -d www.example.com
# or extend the existing cert
sudo certbot --expand -d example.com -d www.example.com -d api.example.com
```

A wildcard `*.example.com` covers `www.example.com` and `api.example.com`, but **not** `example.com` itself or `a.b.example.com`; it needs the DNS-01 challenge.

Both names also need DNS records pointing at your server.

## Cause 2: the wrong certificate is served

If several sites share one IP, the server picks a certificate by SNI. When no `server`/`VirtualHost` matches the requested name, it falls back to the default one — another site's certificate. In nginx, check that the name is in `server_name` of the 443 block that has the right `ssl_certificate`:

```nginx
server {
    listen 443 ssl;
    server_name example.com www.example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Common on shared hosting and CDNs too: after adding a custom domain (GitHub Pages, Netlify, Cloudflare, Heroku), the platform shows its own `*.github.io`-style cert until it has issued one for your domain. Wait for provisioning, or re-trigger it in the dashboard (e.g. GitHub Pages: re-save the custom domain, then tick *Enforce HTTPS*).

## Cause 3: visiting by IP address or an internal name

`https://192.168.1.10` or `https://server01` fails if the cert only names `server01.corp.example.com`. Use the hostname the cert was issued for, or include the IP / short name as SAN entries in an internal certificate.

## Cause 4: self-signed or dev certificate without a SAN

Certificates generated with an old `openssl req` command put the name only in the CN. Create one with a SAN:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout key.pem -out cert.pem \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

For local development, `mkcert localhost 127.0.0.1` creates a trusted certificate with correct SANs.

## Cause 5: interception or a wrong DNS answer

If a site that works for everyone else fails only for you, something else answered: a captive portal (hotel Wi-Fi), antivirus HTTPS scanning, a proxy, or a stale `/etc/hosts` entry pointing the domain at another server. Check `ping example.com` resolves to the expected IP and try another network.
