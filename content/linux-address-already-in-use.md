---
error: "Error: listen EADDRINUSE: address already in use"
error_full: |
  Error: listen EADDRINUSE: address already in use :::3000
cat: linux
description: Another process is already listening on that port. Find it with lsof or ss and stop it, or use a different port.
tldr: "Find the process: `sudo lsof -i :3000` (or `sudo ss -ltnp 'sport = :3000'`). Stop it with `kill <PID>`, or start your app on another port."
keywords: eaddrinuse address already in use port 3000 8080 node python oserror errno 98 kill process lsof
related: [docker-port-is-already-allocated]
---
## What it means

A TCP port can only have one listener per address. Your program tried to listen on a port that some other process (often an older copy of the same program) already holds.

The same problem appears under different names:

- Node.js: `EADDRINUSE`
- Python: `OSError: [Errno 98] Address already in use`
- Java: `java.net.BindException: Address already in use`
- Go: `bind: address already in use`

## Find the process

```bash
sudo lsof -i :3000
# or
sudo ss -ltnp 'sport = :3000'
```

macOS: `lsof -nP -iTCP:3000 -sTCP:LISTEN`.
Windows: `netstat -ano | findstr :3000`, then `taskkill /PID <pid> /F`.

## Stop it

```bash
kill <PID>          # polite
kill -9 <PID>       # if it ignores the first one
```

One-liner (Linux/macOS): `kill $(lsof -t -i :3000)`. Or `npx kill-port 3000`.

## Common causes

- A dev server is still running in another terminal or in the background (check `jobs`, or a stuck `nodemon`).
- A crashed process left a child running.
- A system service uses the port (e.g. port 80 → nginx/apache, 5432 → PostgreSQL, 5000 → AirPlay Receiver on macOS).
- A Docker container publishes the port: `docker ps`.

## Use another port

```bash
PORT=3001 npm start
python -m http.server 8001
```

## TIME_WAIT after restart (Python, C)

If the port is "in use" for a minute after your own server stops, that's TCP `TIME_WAIT`. Set `SO_REUSEADDR` before binding:

```python
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
```

`socketserver`-based servers: set `allow_reuse_address = True` on the class.
