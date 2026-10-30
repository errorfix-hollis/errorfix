---
error: "OCI runtime create failed: exec: executable file not found in $PATH"
error_full: |
  docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: exec: "bash": executable file not found in $PATH: unknown.
  Error response from daemon: OCI runtime exec failed: exec failed: unable to start container process: exec: "bash": executable file not found in $PATH: unknown
cat: docker
description: The command Docker was told to run (CMD, ENTRYPOINT, or the docker run/exec argument) doesn't exist inside the image's filesystem or $PATH. Common with bash on Alpine/distroless images or a malformed CMD.
tldr: "Use a shell that exists in the image: `docker exec -it <container> sh` (Alpine has no bash). Check CMD/ENTRYPOINT use JSON array form with separate arguments: `CMD [\"node\", \"server.js\"]`, not `CMD [\"node server.js\"]`. Verify the binary exists: `docker run --rm --entrypoint sh <image> -c 'which myapp'`."
keywords: docker oci runtime create failed runc create failed exec executable file not found in $PATH unknown bash alpine sh entrypoint cmd distroless starting container process caused
related: [docker-exec-format-error, docker-build-copy-failed-file-not-found, linux-bad-interpreter-no-such-file]
---
## What it means

When a container starts, runc looks up the first word of the command in the container's own `$PATH` (not your host's). If it isn't there, the container fails before your program runs. The quoted name in the message (`exec: "bash"`) is exactly what it searched for — read it carefully, it often reveals the bug.

## Cause 1: the image has no bash

Alpine, BusyBox and many slim images ship only `sh`. Distroless and `scratch` images have no shell at all.

```bash
docker exec -it mycontainer sh          # instead of bash
docker run --rm -it alpine sh
```

Need bash on Alpine? Add it in the Dockerfile:

```dockerfile
RUN apk add --no-cache bash
```

For distroless images, debug with a sidecar shell or use the `:debug` tag variants, which include BusyBox.

## Cause 2: CMD / ENTRYPOINT written as one string inside JSON

In exec (JSON array) form, each argument must be a separate element. Otherwise Docker looks for a binary literally named `node server.js`:

```dockerfile
# Wrong: exec: "node server.js": executable file not found
CMD ["node server.js"]

# Right
CMD ["node", "server.js"]

# Also fine (shell form, runs via /bin/sh -c)
CMD node server.js
```

Same for `docker run`: `docker run img "python app.py"` passes one argument; use `docker run img python app.py`.

## Cause 3: the binary isn't where you think

Maybe the build put it elsewhere, a multi-stage `COPY --from` missed it, or it's installed in a directory not on `$PATH`. Inspect the image:

```bash
docker run --rm --entrypoint sh myimage -c 'echo $PATH; ls -l /app; which myapp'
docker image inspect myimage --format '{{.Config.Entrypoint}} {{.Config.Cmd}} {{.Config.Env}}'
```

Fixes: use an absolute path (`CMD ["/app/myapp"]`), or add the directory to `PATH`:

```dockerfile
ENV PATH="/app/bin:${PATH}"
```

## Cause 4: Python/Node tools installed for another user or venv

`pip install --user` puts scripts in `~/.local/bin`, which may not be on `PATH` for the runtime user. In a venv, activate it via `ENV`:

```dockerfile
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install gunicorn
CMD ["gunicorn", "app:app"]
```

## Cause 5: a script with a missing interpreter

If the target is a script such as `entrypoint.sh` and the file exists, a different error usually appears (`no such file or directory`), caused by a shebang pointing at a missing interpreter (`#!/bin/bash` on Alpine) or Windows CRLF line endings. Fix the line endings and shebang:

```dockerfile
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh
```

and use `#!/bin/sh` if the image has no bash.

## Cause 6: entrypoint overridden by compose

A `command:` or `entrypoint:` in docker-compose.yml overrides the Dockerfile. Check the effective config:

```bash
docker compose config
```
