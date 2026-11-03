---
error: "Error: listen EADDRINUSE: address already in use :::3000"
error_full: |
  node:events:497
        throw er; // Unhandled 'error' event
        ^

  Error: listen EADDRINUSE: address already in use :::3000
      at Server.setupListenHandle [as _listen2] (node:net:1817:16)
      at listenInCluster (node:net:1865:12)
      at Server.listen (node:net:1953:7)
  Emitted 'error' event on Server instance at:
    code: 'EADDRINUSE',
    errno: -98,
    syscall: 'listen',
    address: '::',
    port: 3000
cat: npm
description: Another process (often an old copy of your own dev server) is already listening on that port, so Node can't bind to it. Stop that process or use a different port.
tldr: "Find the process: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows), then kill it: `kill <PID>` / `taskkill /PID <PID> /F`. Or one-liner: `npx kill-port 3000`. Alternatively start on another port: `PORT=3001 npm start`."
keywords: node error listen eaddrinuse address already in use 3000 8080 5000 express nodemon kill port lsof netstat taskkill
related: [linux-address-already-in-use, docker-port-is-already-allocated, java-spring-port-8080-was-already-in-use]
---
## What it means

Only one socket can listen on a given address and port. `EADDRINUSE` (errno 98 on Linux, 48 on macOS) means something else got there first. `:::3000` means Node tried to listen on all IPv6 (and usually IPv4) addresses on port 3000.

## Fix 1: find and stop the process using the port

**macOS / Linux:**

```bash
lsof -i :3000            # shows COMMAND and PID
kill <PID>               # polite
kill -9 <PID>            # if it won't die
# or in one go:
kill $(lsof -t -i :3000)
```

On Linux without `lsof`: `sudo ss -ltnp | grep :3000` or `sudo fuser -k 3000/tcp`.

**Windows (cmd / PowerShell):**

```bat
netstat -ano | findstr :3000
taskkill /PID 12345 /F
```

PowerShell: `Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process`.

**Cross-platform:**

```bash
npx kill-port 3000
```

## Cause 1: an old dev server is still running

Common situations:

- You closed a terminal tab but the `node` / `nodemon` process kept running.
- You pressed `Ctrl+Z` instead of `Ctrl+C` — that *suspends* the process, it still holds the port. Run `fg` then `Ctrl+C`, or `kill %1`.
- VS Code's debugger or a second terminal is running the same app.

## Cause 2: nodemon restarts too fast

On restart, nodemon may start the new process before the old one releases the port. Make sure the old server shuts down cleanly:

```js
const server = app.listen(PORT);
process.once('SIGUSR2', () => server.close(() => process.kill(process.pid, 'SIGUSR2')));
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
```

If you call `app.listen()` twice in your code (e.g. once in `app.js` and once in `server.js`, or in a test file that imports the app), the second call fails with this error. Export the `app` and call `listen` in one place only.

## Cause 3: another program uses that port

Port 3000 (other dev servers), 5000 (macOS AirPlay Receiver since Monterey), 8080 (Tomcat, proxies) and 5432/3306 (databases) are commonly taken. On macOS, disable AirPlay Receiver in System Settings → General → AirDrop & Handoff, or just pick another port.

## Fix 2: make the port configurable

```js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
```

```bash
PORT=3001 npm start          # macOS/Linux
set PORT=3001 && npm start   # Windows cmd
```

## Fix 3: handle the error gracefully

```js
const server = app.listen(PORT);
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is in use. Stop the other process or set PORT.`);
    process.exit(1);
  }
  throw err;
});
```

## Docker

If the port is published by a container (`docker ps` shows `0.0.0.0:3000->3000/tcp`), stop it with `docker stop <container>` or map a different host port: `-p 3001:3000`.
