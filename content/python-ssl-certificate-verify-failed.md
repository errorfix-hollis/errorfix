---
error: "ssl.SSLCertVerificationError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate"
cat: python
description: Python can't verify the server's HTTPS certificate. Usually missing CA certificates (macOS python.org installs), a corporate proxy, or an outdated certifi.
tldr: "macOS (python.org installer): run `/Applications/Python\\ 3.x/Install\\ Certificates.command`. Everywhere else: `python -m pip install --upgrade certifi`. Behind a company proxy, point `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` at its CA certificate."
keywords: ssl certificate_verify_failed unable to get local issuer certificate python requests urllib pip macos certifi proxy self signed
related: [python-modulenotfounderror-no-module-named]
---
## What it means

When connecting over HTTPS, Python checks the server's certificate against a list of trusted certificate authorities (CAs). It couldn't build a chain from the server's certificate to any CA it trusts.

## Cause 1: macOS with Python from python.org

That installer doesn't use the macOS keychain, and ships a script to install CA certificates:

```bash
open "/Applications/Python 3.12/Install Certificates.command"
```

(Adjust the version number.) Homebrew Python doesn't have this problem.

## Cause 2: outdated certificate bundle

`requests` uses the `certifi` package:

```bash
python -m pip install --upgrade certifi requests
```

On Linux, update the system store: `sudo apt install --reinstall ca-certificates` (Debian/Ubuntu) or `sudo update-ca-trust` (Fedora/RHEL).

## Cause 3: a corporate proxy or antivirus intercepting HTTPS

These replace site certificates with their own, signed by a company CA that Python doesn't know. Get the CA certificate (`.pem`/`.crt`) from IT, then:

```bash
export REQUESTS_CA_BUNDLE=/path/to/company-ca.pem   # requests
export SSL_CERT_FILE=/path/to/company-ca.pem        # urllib, httpx, many others
pip config set global.cert /path/to/company-ca.pem  # pip
```

Python 3.10+ can also use the OS certificate store via `pip install truststore` (`truststore.inject_into_ssl()` in your code; pip 24.2+ uses it automatically).

## Cause 4: the server is misconfigured

If only one site fails, check it with `openssl s_client -connect example.com:443 -servername example.com`. A missing intermediate certificate or an expired certificate is the server owner's problem. You can pass the missing intermediate explicitly: `requests.get(url, verify="/path/to/chain.pem")`.

## Don't disable verification

`verify=False` makes the error go away by accepting **any** certificate, including an attacker's. Use it only for a quick local test, never in real code.
