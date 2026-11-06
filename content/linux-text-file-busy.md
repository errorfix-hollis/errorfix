---
error: "Text file busy"
error_full: |
  bash: ./server: Text file busy
  cp: cannot create regular file '/usr/local/bin/app': Text file busy
cat: linux
description: Linux refuses to overwrite a binary that is currently running (ETXTBSY), or to execute a file that is still open for writing. Stop the process, or replace the file instead of writing into it.
tldr: "Find who uses it: `fuser -v ./server` or `lsof ./server`. Stop that process, or replace the file atomically instead of overwriting it: `cp new-app /usr/local/bin/app.new && mv /usr/local/bin/app.new /usr/local/bin/app` (or `install -m 755 new-app /usr/local/bin/app`). If you just wrote a script, make sure the writer closed the file before running it."
keywords: linux text file busy etxtbsy cannot create regular file cp binary running fuser lsof mv atomic replace install go build docker script
related: [linux-permission-denied-running-script, linux-cannot-execute-binary-file, linux-address-already-in-use]
---
## What it means

`ETXTBSY` ("text" is the old Unix name for a program's executable code) appears in two situations:

1. **Writing to an executable that is running.** The kernel maps the binary into memory; letting you modify it in place could crash the running process, so `open()` for writing fails.
2. **Executing a file that is open for writing** by some process (including your own). The kernel refuses to run a half-written program.


## Find the process using the file

```bash
fuser -v /usr/local/bin/app
lsof /usr/local/bin/app
```

Output shows the PID and whether it's executing (`e`) or has the file open (`F`, writing).

## Cause 1: you're copying over a running binary

```bash
cp ./build/app /usr/local/bin/app
# cp: cannot create regular file '/usr/local/bin/app': Text file busy
```

`cp` opens the existing file and truncates it — that's the write that's refused.

### Fix: replace instead of overwrite

Write a new file and rename it over the old one. `rename()` swaps the directory entry; the running process keeps the old inode until it exits:

```bash
cp ./build/app /usr/local/bin/app.new
mv /usr/local/bin/app.new /usr/local/bin/app
```

Or let `install` do it (it unlinks and creates a new file):

```bash
sudo install -m 755 ./build/app /usr/local/bin/app
```

`cp --remove-destination` also works. Then restart the service so it runs the new binary:

```bash
sudo systemctl restart app
```

### Or stop it first

```bash
sudo systemctl stop app       # or: kill <PID>
cp ./build/app /usr/local/bin/app
sudo systemctl start app
```

## Cause 2: `go build` / `cargo build` / `gcc -o` while the program runs

Compilers write output in place. If the previous build is still running in another terminal, the link step fails with "text file busy". Stop the old process, or with Go, use `go run .` / a file watcher (air, reflex) that kills the process before rebuilding.

## Cause 3: running a script that's still open for writing

Common in scripts that generate and immediately run another script, and in Docker builds:

```bash
cat > run.sh <<EOF
echo hi
EOF
./run.sh        # usually fine — the heredoc is closed
```

The problem appears when a file descriptor is still open, e.g. a Python script that writes a file and calls `subprocess.run()` before `f.close()`:

```python
with open("run.sh", "w") as f:
    f.write("#!/bin/sh\necho hi\n")
os.chmod("run.sh", 0o755)
subprocess.run(["./run.sh"])     # outside the with-block: closed, OK
```

Also watch for a *child process* inheriting the writable descriptor (fork while the file is open). In multi-threaded programs this race is a known source of intermittent ETXTBSY; opening with `O_CLOEXEC` (Python does by default) avoids it. Retrying after a short sleep is a common workaround in build tools.

## Cause 4: Docker and shared volumes

`docker cp` or a bind-mounted file being replaced while the container executes it gives the same error. Stop the container, or replace via rename as above. On some overlay/NFS setups, check with `lsof` on the host.

## Cause 5: swap file

`swapon` on a file that's open elsewhere, or trying to write to an active swap file, also returns ETXTBSY. Turn it off first with `sudo swapoff /swapfile`.
