---
error: "MISCONF Redis is configured to save RDB snapshots, but it's currently unable to persist to disk."
error_full: |
  (error) MISCONF Redis is configured to save RDB snapshots, but it's currently unable to persist to disk. Commands that may modify the data set are disabled, because this instance is configured to report errors during writes if RDB snapshotting fails (stop-writes-on-bgsave-error option). Please check the Redis logs for details about the RDB error.
cat: database
description: Redis's background save (BGSAVE) failed, so it refuses writes to protect you from losing data. The cause is in the Redis log - usually a full disk, a directory Redis can't write to, or fork failing for lack of memory.
tldr: "Check the log (`journalctl -u redis-server` or `docker logs <container>`) and `redis-cli INFO persistence`. Free disk space, fix ownership of the data dir (`CONFIG GET dir`; `sudo chown redis:redis /var/lib/redis`), or for fork errors set `vm.overcommit_memory = 1`. Then `redis-cli BGSAVE` to confirm. `CONFIG SET stop-writes-on-bgsave-error no` only hides the problem."
keywords: redis misconf configured to save rdb snapshots unable to persist to disk stop-writes-on-bgsave-error bgsave failed fork cannot allocate memory overcommit_memory dump.rdb permission denied
related: [linux-no-space-left-on-device, docker-no-space-left-on-device, db-sqlite-database-is-locked]
---
## What it means

With RDB persistence on (the default `save` rules), Redis periodically forks a child that writes the dataset to `dump.rdb`. If the last save failed and `stop-writes-on-bgsave-error` is `yes` (the default), Redis rejects every write command with `MISCONF` until a save succeeds. Reads still work.

Find out why the save failed:

```bash
redis-cli INFO persistence | grep -E "rdb_last_bgsave_status|rdb_changes_since_last_save"
redis-cli CONFIG GET dir
redis-cli CONFIG GET dbfilename

sudo journalctl -u redis-server -n 50     # Debian/Ubuntu service name
sudo tail -n 50 /var/log/redis/redis-server.log
docker logs my-redis --tail 50            # in Docker
```

The log line that matters looks like `Failed opening the temp RDB file temp-1234.rdb (in server root dir /var/lib/redis) for saving: Permission denied` or `Can't save in background: fork: Cannot allocate memory`.

## Cause 1: disk full

```bash
df -h "$(redis-cli CONFIG GET dir | tail -1)"
```

Free up space (old logs, Docker images, large files) or move the data directory to a bigger disk. Redis needs room for a full temporary copy of the RDB file while saving.

## Cause 2: Redis can't write to its directory (Permission denied)

The data dir must be writable by the user Redis runs as:

```bash
sudo chown -R redis:redis /var/lib/redis
sudo chmod 750 /var/lib/redis
```

A frequent variant: the `dir` was changed at runtime to something like `/etc` or `/root`, sometimes by an attacker on an exposed Redis (`CONFIG SET dir`, `CONFIG SET dbfilename`). If `CONFIG GET dir` shows an odd location you didn't set, treat the server as compromised: make sure Redis isn't reachable from the internet (`bind 127.0.0.1`, `protected-mode yes`, a password via `requirepass` or ACLs, a firewall) and check for unexpected `authorized_keys` or cron entries. Then set the directory back:

```bash
redis-cli CONFIG SET dir /var/lib/redis
redis-cli CONFIG SET dbfilename dump.rdb
```

In Docker, make sure the mounted volume for `/data` is writable by the container's redis user.

## Cause 3: fork fails (Cannot allocate memory)

Forking a large Redis process requires the kernel to allow overcommit. Redis itself warns about this at startup:

```bash
echo "vm.overcommit_memory = 1" | sudo tee /etc/sysctl.d/99-redis.conf
sudo sysctl --system
```

Also check that the server isn't genuinely out of RAM (`free -m`), and set `maxmemory` so Redis leaves headroom for the fork.

## Confirm the fix

```bash
redis-cli BGSAVE
redis-cli INFO persistence | grep rdb_last_bgsave_status   # should be ok
```

Once a save succeeds, writes are accepted again.

## If you don't need persistence

For a pure cache, turn off RDB snapshots instead of ignoring errors:

```bash
redis-cli CONFIG SET save ""
redis-cli CONFIG REWRITE      # persist to redis.conf
```

or `save ""` in `redis.conf`.

`CONFIG SET stop-writes-on-bgsave-error no` makes the error go away while saves keep failing silently; you'll lose data on restart without knowing it. Use it only as a temporary measure while you fix the real cause.
