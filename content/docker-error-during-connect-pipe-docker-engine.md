---
error: "error during connect: open //./pipe/docker_engine: The system cannot find the file specified."
error_full: |
  error during connect: this error may indicate that the docker daemon is not running: Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.24/containers/json": open //./pipe/docker_engine: The system cannot find the file specified.
cat: docker
description: "On Windows, the docker CLI can't reach the Docker Engine named pipe. Docker Desktop isn't running (or is still starting), the engine crashed, or the CLI is pointed at the wrong context."
tldr: "Start Docker Desktop and wait until it says Engine running, then retry. If it still fails: `docker context ls` and `docker context use desktop-linux` (or `default`), restart with `wsl --shutdown` then reopen Docker Desktop, and make sure WSL 2 / virtualization is enabled (`wsl --update`)."
keywords: docker error during connect pipe docker_engine the system cannot find the file specified windows docker desktop not running dockerDesktopLinuxEngine wsl 2 context
related: [docker-cannot-connect-to-the-docker-daemon, docker-permission-denied-docker-sock]
---
## What it means

On Windows the docker CLI talks to the engine through a named pipe (`//./pipe/docker_engine` or `//./pipe/dockerDesktopLinuxEngine`). "The system cannot find the file specified" means that pipe doesn't exist: nothing is listening. It's the Windows version of `Cannot connect to the Docker daemon`.

## Fix 1: start Docker Desktop

Docker Desktop must be running; the CLI alone is not enough.

- Start it from the Start menu and wait for the whale icon to say **Engine running** (the first start can take a minute).
- Enable *Settings → General → Start Docker Desktop when you sign in* to avoid this after reboots.

Then:

```powershell
docker version     # both Client and Server sections should appear
```

## Fix 2: wrong context

The CLI may point to a pipe that isn't used by your setup.

```powershell
docker context ls
docker context use desktop-linux   # Docker Desktop (recent versions)
# or
docker context use default
```

Also check that `DOCKER_HOST` isn't set to something stale:

```powershell
echo $env:DOCKER_HOST
Remove-Item Env:DOCKER_HOST     # current session
```

and remove it from *System → Environment Variables* if it's set there.

## Fix 3: the engine failed to start (WSL 2 backend)

If Docker Desktop shows an error or keeps "Starting":

```powershell
wsl --update
wsl --shutdown
```

Then reopen Docker Desktop. Also verify:

- Virtualization is enabled in BIOS/UEFI (Task Manager → Performance → CPU → *Virtualization: Enabled*).
- Windows features **Virtual Machine Platform** and **Windows Subsystem for Linux** are on (`optionalfeatures.exe`), then reboot.
- Docker Desktop → *Troubleshoot* → *Restart* or, as last resort, *Reset to factory defaults* (deletes images and containers).

## Fix 4: Windows containers vs Linux containers

Pipe `docker_engine` vs `dockerDesktopLinuxEngine` depends on the mode. Right-click the tray icon → *Switch to Linux containers…* (or Windows containers) to match what you need, then retry.

## Fix 5: permissions

If the pipe exists but you get `Access is denied`, your user isn't allowed to use it. Add yourself to the `docker-users` group (an admin runs):

```powershell
net localgroup docker-users "%USERNAME%" /add
```

Sign out and back in.

## Fix 6: running docker inside WSL

In a WSL distro, use the Linux socket, not the pipe: enable *Settings → Resources → WSL integration* for your distro in Docker Desktop. Then inside WSL `docker ps` uses `/var/run/docker.sock`. If you installed Docker Engine directly inside WSL instead, start it with `sudo service docker start`.
