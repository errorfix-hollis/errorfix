---
error: "requests.exceptions.ConnectionError: HTTPConnectionPool: Max retries exceeded with url"
error_full: |
  requests.exceptions.ConnectionError: HTTPSConnectionPool(host='api.example.com', port=443): Max retries exceeded with url: /v1/items (Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7f...>: Failed to establish a new connection: [Errno 111] Connection refused'))
cat: python
description: "requests could not open a TCP connection to the host at all. The real reason is in the Caused by part: connection refused, DNS failure, timeout, SSL error or a proxy problem."
tldr: "Read the `Caused by` text. `Connection refused` = nothing listening on that host/port (start the server, fix the port, use the service name instead of `localhost` in Docker). `Name or service not known` / `getaddrinfo failed` = DNS or typo in the hostname. `timed out` = firewall/proxy. Test with `curl -v URL` first, and always pass `timeout=` to requests."
keywords: python requests connectionerror max retries exceeded with url httpconnectionpool newconnectionerror failed to establish a new connection connection refused errno 111 getaddrinfo failed urllib3
related: [python-ssl-certificate-verify-failed, linux-temporary-failure-in-name-resolution, web-err-connection-refused]
---
## What it means

"Max retries exceeded" sounds like requests retried many times, but by default it doesn't retry at all; urllib3 just wraps every connection failure in a `MaxRetryError`. Ignore that part and look at the end of the message, `Caused by ...`. Reproduce outside Python first:

```bash
curl -v https://api.example.com/v1/items
```

If curl fails the same way, the problem is network/server, not your code.

## Cause 1: `[Errno 111] Connection refused` (Windows: `WinError 10061`)

The host is reachable but nothing is listening on that port.

- The server isn't running, or crashed. Start it and check: `ss -ltnp | grep 8000`.
- Wrong port or scheme: `http://` vs `https://`, `:8000` vs `:5000`.
- The server listens on `127.0.0.1` only, and you connect from another machine/container. Bind it to `0.0.0.0` (e.g. `flask run --host 0.0.0.0`, `uvicorn app:app --host 0.0.0.0`).
- **Docker**: `localhost` inside a container is the container itself. Use the compose service name (`http://api:8000`) or `host.docker.internal` to reach the host.

## Cause 2: DNS - `Name or service not known` / `getaddrinfo failed` / `nodename nor servname provided`

The hostname can't be resolved. Check for typos and that you didn't include the scheme twice (`https://https://...`) or a path in the host. Test with `nslookup api.example.com`. In containers or WSL, see [Temporary failure in name resolution](/linux/linux-temporary-failure-in-name-resolution/).

## Cause 3: `Connection timed out` / `ConnectTimeoutError`

Packets are dropped: firewall, security group, VPN, or a corporate network that requires a proxy. Set the proxy for requests:

```bash
export HTTPS_PROXY=http://proxy.corp:3128
export HTTP_PROXY=http://proxy.corp:3128
```

Or `requests.get(url, proxies={"https": "http://proxy.corp:3128"})`. Conversely, a stale `HTTP_PROXY` in your environment causes `ProxyError`; `unset` it or set `NO_PROXY=localhost,127.0.0.1`.

## Cause 4: the server is rate-limiting or dropping you

`RemoteDisconnected` / `Connection aborted` / `Connection reset by peer` on many quick requests means the server closes connections (rate limit, bot protection). Slow down, reuse a `Session`, and add real retries with backoff:

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

s = requests.Session()
retry = Retry(total=5, backoff_factor=1,
              status_forcelist=[429, 500, 502, 503, 504])
s.mount("https://", HTTPAdapter(max_retries=retry))
s.mount("http://", HTTPAdapter(max_retries=retry))

r = s.get("https://api.example.com/v1/items", timeout=10)
```

## Cause 5: SSL errors

If `Caused by SSLError(...)`, the TCP connection worked but TLS failed. See [SSL: CERTIFICATE_VERIFY_FAILED](/python/python-ssl-certificate-verify-failed/). Don't hide it with `verify=False` in production.

## Handle it in code

Catch the exception so one bad host doesn't crash the program, and always set a timeout (requests waits forever by default):

```python
try:
    r = requests.get(url, timeout=(5, 30))
    r.raise_for_status()
except requests.exceptions.ConnectionError as e:
    print("could not connect:", e)
```
