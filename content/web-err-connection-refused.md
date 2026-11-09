---
error: "ERR_CONNECTION_REFUSED"
error_full: |
  This site can't be reached
  localhost refused to connect.
  ERR_CONNECTION_REFUSED
cat: web
description: "The browser reached the machine but nothing accepted a connection on that port. Usually the server isn't running, is on a different port, or listens only on another interface (e.g. 127.0.0.1 inside a container)."
tldr: "Check something listens on the port: `ss -ltnp | grep :3000` (Windows: `netstat -ano | findstr :3000`). Start the server, use the port it actually prints, and in Docker/VMs bind to `0.0.0.0` and publish the port (`docker run -p 3000:3000`). Try `http://` not `https://`."
keywords: err_connection_refused localhost refused to connect this site can't be reached chrome connection refused port 3000 8080 docker 0.0.0.0 127.0.0.1 dev server
related: [web-nginx-502-bad-gateway, linux-address-already-in-use, docker-port-is-already-allocated]
---
## What it means

The TCP connection got an immediate "reset/refused" reply: the host is up, but **no process is listening** on that address and port (or a firewall actively rejects it). It is not a timeout — a timeout means packets are dropped (`ERR_CONNECTION_TIMED_OUT`).

Check from the same machine:

```bash
curl -v http://localhost:3000
ss -ltnp | grep 3000          # Linux
lsof -iTCP:3000 -sTCP:LISTEN  # macOS
netstat -ano | findstr :3000  # Windows
```

## Cause 1: the server isn't running (or crashed)

The dev server stopped, failed to compile, or exited on an error. Look at the terminal where you started it. Restart it and wait for the "listening on" / "ready" line before refreshing.

For services:

```bash
systemctl status myapp
journalctl -u myapp -n 50
```

## Cause 2: wrong port

Frameworks pick different defaults and silently switch ports when one is busy: Vite 5173, Create React App 3000, Next.js 3000, Angular 4200, Django 8000, Flask 5000, Spring Boot 8080. Use the URL the server prints. If it says "Port 3000 is in use, trying 3001", either use 3001 or free 3000 (see [Address already in use](/linux/linux-address-already-in-use/)).

## Cause 3: https vs http

Typing `https://localhost:3000` when the dev server only speaks HTTP usually gives `ERR_SSL_PROTOCOL_ERROR`, but browsers that auto-upgrade or an HSTS entry for `localhost` can make it look like a refusal. Use `http://` explicitly, or clear the HSTS entry at `chrome://net-internals/#hsts`.

## Cause 4: listening on 127.0.0.1 inside Docker, a VM or WSL

A server bound to `127.0.0.1` only accepts connections from inside its own container/VM. Bind to all interfaces:

```bash
vite --host 0.0.0.0
next dev -H 0.0.0.0
flask run --host=0.0.0.0
python manage.py runserver 0.0.0.0:8000
```

And publish the port in Docker:

```bash
docker run -p 3000:3000 myimage
docker ps        # PORTS column should show 0.0.0.0:3000->3000/tcp
```

## Cause 5: localhost resolves to IPv6

`localhost` may resolve to `::1` first, while the server only listens on IPv4 `127.0.0.1` (Node 17+ stopped reordering to IPv4 first). Try `http://127.0.0.1:3000`. If that works, bind the server to `::`/`0.0.0.0` or use the IP in your config.

## Cause 6: firewall or remote host

When connecting to another machine, check its firewall allows the port:

```bash
sudo ufw status
sudo ufw allow 8080/tcp
```

and that the app isn't bound to `127.0.0.1` there (Cause 4).

## Cause 7: reverse proxy upstream down

If you get a 502 from nginx instead, nginx is up but the app behind it refused the connection — see [nginx 502 Bad Gateway](/web/web-nginx-502-bad-gateway/).
