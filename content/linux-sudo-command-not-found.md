---
error: "sudo: command not found"
error_full: |
  bash: sudo: command not found
  /bin/sh: 1: sudo: not found
  sudo: apt-get: command not found
cat: linux
description: "Either the sudo package isn't installed (common in Docker images and minimal Debian installs), or sudo works but the command after it isn't on sudo's secure_path."
tldr: "If `sudo` itself is missing: become root (`su -`, or in Docker you are usually root already) and run `apt-get update && apt-get install -y sudo` (Alpine: `apk add sudo`), then `usermod -aG sudo <user>`. If it's `sudo: <cmd>: command not found`, use the full path (`sudo $(which cmd)`) or add its directory to `secure_path` with `visudo`."
keywords: linux sudo command not found bash sudo not found docker debian minimal install sudo package su root usermod sudo group secure_path visudo
related: [linux-command-not-found, linux-sudo-unable-to-resolve-host, linux-permission-denied-running-script]
---
## What it means

There are two different errors that look alike:

1. `bash: sudo: command not found`: the `sudo` program doesn't exist on this system (or isn't on `PATH`).
2. `sudo: npm: command not found`: sudo works, but it runs commands with its own restricted `PATH` (`secure_path`) and can't find the program.

## Case 1: sudo isn't installed

### In a Docker container

Most base images (`debian`, `ubuntu`, `node`, `python`, `alpine`) don't ship sudo, and **you are already root** by default. Just drop `sudo`:

```dockerfile
RUN apt-get update && apt-get install -y curl
```

Check with `whoami` or `id -u` (0 = root). If the image switches to a non-root `USER`, do root work before that line, or switch back temporarily:

```dockerfile
USER root
RUN apt-get update && apt-get install -y curl
USER app
```

To run commands as root in a running container: `docker exec -u 0 -it <container> bash`.

### On a minimal Debian (or other) install

Debian doesn't install sudo if you set a root password during installation. Become root and install it:

```bash
su -                      # enter the ROOT password
apt-get update
apt-get install -y sudo
usermod -aG sudo yourname
exit
```

Log out and back in (group membership is read at login), then test with `sudo -v`.

Other distros:

```bash
dnf install -y sudo && usermod -aG wheel yourname      # Fedora/RHEL
apk add sudo && adduser yourname wheel && echo '%wheel ALL=(ALL:ALL) ALL' > /etc/sudoers.d/wheel   # Alpine
pacman -S sudo                                          # Arch (then enable %wheel in visudo)
```

Use `su -` rather than plain `su`: the dash gives you root's `PATH` including `/usr/sbin`, otherwise `usermod` itself may be "command not found".

### Installed, but not on PATH

If `/usr/bin/sudo` exists but the shell can't find it, your `PATH` is broken (often after editing `~/.bashrc`). Check `echo $PATH`, run `/usr/bin/sudo` directly, and fix the line that overwrites `PATH` (use `export PATH="$HOME/bin:$PATH"`, not `export PATH="$HOME/bin"`).

## Case 2: `sudo: <command>: command not found`

sudo resets `PATH` to `secure_path` from `/etc/sudoers` (typically `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`). Tools installed under your home directory, such as nvm's `node`/`npm`, pyenv, `~/.local/bin`, `~/go/bin` or `~/.cargo/bin`, aren't on it.

Options, best first:

- **Don't use sudo** for user-level tools. With nvm, `npm install -g` doesn't need sudo.
- Use the full path: `sudo "$(which npm)" install -g pm2`.
- Pass your PATH for one command: `sudo env "PATH=$PATH" npm install -g pm2`.
- Add the directory permanently with `sudo visudo` (edit the `Defaults secure_path=` line).

For the general case of a missing program, see [command not found](/linux/linux-command-not-found/).
