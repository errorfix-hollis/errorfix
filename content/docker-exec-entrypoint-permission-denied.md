---
error: "exec /usr/local/bin/docker-entrypoint.sh: permission denied"
error_full: |
  exec /usr/local/bin/docker-entrypoint.sh: permission denied
  docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: exec: "/docker-entrypoint.sh": permission denied: unknown.
cat: docker
description: "The container tried to execute its entrypoint script, but the file isn't executable inside the image (no +x bit), is on a noexec mount, or the container user can't read it."
tldr: "Give the script the execute bit in the image: `COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/` (BuildKit) or `RUN chmod +x /usr/local/bin/docker-entrypoint.sh` after the COPY. On Windows also commit the bit: `git update-index --chmod=+x docker-entrypoint.sh`. Or bypass it: `ENTRYPOINT [\"sh\", \"/usr/local/bin/docker-entrypoint.sh\"]`."
keywords: docker exec docker-entrypoint.sh permission denied oci runtime create failed exec permission denied unknown chmod +x copy --chmod entrypoint windows git update-index noexec volume mount non-root user
related: [docker-standard-init-linux-exec-user-process-caused-no-such-file-or-directory, docker-oci-runtime-create-failed-executable-file-not-found, linux-permission-denied-running-script]
---
## What it means

The kernel's `execve()` refused to run the file with `EACCES`. For a script that means: the file lacks the execute permission for the container user, or a directory on its path isn't searchable, or the filesystem is mounted `noexec`. Docker copies file modes from the build context, so a script that isn't executable on your machine (or in git) isn't executable in the image either.

Check inside the image:

```bash
docker run --rm --entrypoint sh myimage -c 'ls -l /usr/local/bin/docker-entrypoint.sh; id'
```

`-rw-r--r--` = missing `x`. Decode modes with the [chmod calculator](/tools/chmod-calculator/).

## Fix 1: set the mode in the Dockerfile

With BuildKit (default since Docker 23):

```dockerfile
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]
```

Or classic:

```dockerfile
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
```

Put the `RUN chmod` *before* any `USER` instruction, as the non-root user can't chmod a root-owned file. Rebuild without stale layers if needed: `docker build --no-cache .`.

## Fix 2: the bit is lost in git (Windows / CI)

Files created on Windows are committed without the executable bit, so CI and colleagues build an image with a non-executable script. Set it in git:

```bash
git update-index --chmod=+x docker-entrypoint.sh
git commit -m "Make entrypoint executable"
git ls-files -s docker-entrypoint.sh   # 100755 = executable
```

While you're at it, make sure the script has LF line endings; CRLF gives a different error, `no such file or directory` (see [standard_init_linux.go: no such file or directory](/docker/docker-standard-init-linux-exec-user-process-caused-no-such-file-or-directory/)). The [line ending inspector](/tools/line-ending-whitespace-inspector/) shows which you have.

## Fix 3: run it through the shell

The shell only needs *read* permission, so this works without `+x`:

```dockerfile
ENTRYPOINT ["sh", "/usr/local/bin/docker-entrypoint.sh"]
```

Use `bash` instead of `sh` if the script relies on bash features (and the image has bash). Keep `exec "$@"` at the end of the script so the CMD becomes PID 1 and receives signals.

## Fix 4: a bind mount overrides the file

In Compose, `volumes: - ./docker-entrypoint.sh:/usr/local/bin/docker-entrypoint.sh` or `- .:/app` replaces the image's file with the host file and its host permissions. Run `chmod +x docker-entrypoint.sh` on the host, or don't mount over it. On mounts from Windows/WSL drives (`/mnt/c/...`) or from `noexec` filesystems, execution can fail regardless; use Fix 3.

## Fix 5: non-root user can't read it

If you `COPY` as root with restrictive modes (`700`) and then switch `USER app`, the app user can't open the file. Use `755`, or `COPY --chown=app:app --chmod=755 ...`.

## Official images

For images like `postgres` or `mysql`, this error usually comes from your own scripts mounted into `/docker-entrypoint-initdb.d/` or from a custom image built on top. Apply the same chmod fix to those files.
