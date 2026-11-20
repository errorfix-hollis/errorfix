---
error: "the input device is not a TTY"
error_full: |
  the input device is not a TTY
  the input device is not a TTY.  If you are using mintty, try prefixing the command with 'winpty'
  cannot attach stdin to a TTY-enabled container because stdin is not a terminal
cat: docker
description: "`docker run -t` / `docker exec -it` asked for a pseudo-terminal, but the command's stdin isn't a terminal — typically in CI, cron, scripts with piped input, or Git Bash (mintty) on Windows."
tldr: "Remove `-t` (keep `-i` if you pipe input) when running non-interactively: `docker exec -i mydb psql -U postgres < dump.sql`. In CI use `docker compose exec -T`. In Git Bash on Windows prefix with `winpty`: `winpty docker exec -it app bash`."
keywords: docker the input device is not a tty docker exec -it docker run -t jenkins github actions gitlab ci cron git bash mintty winpty docker compose exec -T stdin pipe
related: [docker-cannot-connect-to-the-docker-daemon, docker-oci-runtime-create-failed-executable-file-not-found, docker-container-name-already-in-use]
---
## What it means

The two flags do different things:

- `-i` (`--interactive`): keep the container's stdin open and connect it to yours.
- `-t` (`--tty`): allocate a pseudo-terminal inside the container.

`-t` only works if *your* stdin is a real terminal. When the Docker CLI runs from a CI job, a cron job, a script with `<` or `|` input, or a terminal emulator that doesn't expose a Windows console (mintty), there is no TTY to attach, so Docker refuses.

## Fix 1: drop -t in scripts and CI

If nobody is typing into the container, you don't need a TTY.

```bash
# output only
docker exec mycontainer ls /app

# feed input from a file or pipe: keep -i, drop -t
docker exec -i mydb psql -U postgres -d app < dump.sql
cat backup.sql | docker exec -i mysql mysql -uroot -p"$PW" app
docker exec -i mydb pg_dump -U postgres app > dump.sql
```

This applies to Jenkins, GitHub Actions, GitLab CI, Ansible, systemd units and cron.

## Fix 2: docker compose exec -T

`docker compose exec` allocates a TTY **by default**, so it fails in CI even without `-t`. Disable it with `-T`:

```bash
docker compose exec -T db psql -U postgres -c "select 1"
docker compose exec -T app npm test
docker compose run --rm -T app python manage.py migrate
```

## Fix 3: Git Bash / mintty on Windows

Git Bash's default terminal (mintty) isn't a Windows console, which is what the message hints at. Options:

```bash
winpty docker exec -it mycontainer bash
winpty docker run -it ubuntu bash
```

Or create an alias in `~/.bashrc`: `alias docker='winpty docker'`. Alternatively run the command from PowerShell, Windows Terminal, or enable "Use Windows' default console window" when installing Git for Windows. Recent Git for Windows versions with ConPTY support often don't need `winpty`.

## Fix 4: only use -t when there is a terminal

For scripts that run both interactively and in CI, detect a TTY:

```bash
TTY_FLAG=""
[ -t 0 ] && TTY_FLAG="-t"
docker exec -i $TTY_FLAG mycontainer bash -c "./run.sh"
```

`[ -t 0 ]` is true when stdin is a terminal.

## Related: "cannot attach stdin to a TTY-enabled container"

This appears with `docker attach` or `docker start -a -i` when the container was created with `-t` but your current stdin isn't a terminal. Run it from an interactive shell, or use `docker logs -f <container>` to just watch output. For a one-off command, `docker exec` (without `-t`) is simpler than attaching.
