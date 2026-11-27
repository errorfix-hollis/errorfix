---
error: "sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper"
error_full: |
  sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
  sudo: a password is required
cat: linux
description: "sudo needs a password but there is no TTY to ask on, because the command runs non-interactively: over ssh without -t, in a script, cron job, CI pipeline, Ansible task or Docker build. Allow the command without a password, or provide a TTY."
tldr: "For a one-off ssh command, force a TTY: `ssh -t user@host 'sudo systemctl restart app'`. For automation, allow only the needed command without a password via `sudo visudo -f /etc/sudoers.d/deploy` with `deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart app`. In Ansible use `--ask-become-pass`."
keywords: sudo a terminal is required to read the password use the -S option askpass helper sudo a password is required ssh -t nopasswd sudoers visudo ansible become jenkins github actions cron script
related: [linux-user-is-not-in-the-sudoers-file, linux-sudo-command-not-found, ssh-permission-denied-publickey]
---
## What it means

By default sudo reads your password from the terminal (`/dev/tty`), not from standard input. When a command runs without a terminal — `ssh host 'sudo ...'`, a cron job, a systemd service, a CI runner, a Git hook, Ansible, `docker exec` without `-t` — there is nothing to prompt on, so sudo gives up. Older sudo versions print `sudo: no tty present and no askpass program specified` for the same situation.

Check whether a terminal exists in that context with `tty` (prints `not a tty` when there is none) and see what sudo would allow without asking with `sudo -n -l`.

## Fix 1: ssh — allocate a TTY

```bash
ssh -t user@server 'sudo systemctl restart nginx'
```

`-t` forces a pseudo-terminal so sudo can prompt. Use `-tt` if ssh's own stdin is not a terminal either (e.g. inside a script). This still needs a human to type the password, so it doesn't help in unattended jobs.

## Fix 2: allow specific commands without a password (automation)

Create a drop-in sudoers file — always with `visudo`, which checks syntax so you can't lock yourself out:

```bash
sudo visudo -f /etc/sudoers.d/deploy
```

```
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart myapp, /usr/bin/systemctl status myapp
```

- Use full paths (`command -v systemctl`).
- Arguments are matched literally; restrict them as tightly as you can.
- Avoid `NOPASSWD: ALL` for service accounts that run code from the network (CI runners, web apps).
- Files in `/etc/sudoers.d/` must not contain `.` or end in `~` or they're ignored, and should be mode 0440.

Test non-interactively: `sudo -n systemctl restart myapp` (`-n` fails instead of prompting).

## Fix 3: Ansible

Ansible's `become: true` needs the password passed in:

```bash
ansible-playbook site.yml --ask-become-pass     # prompts once
```

Or store `ansible_become_password` in an Ansible Vault-encrypted vars file. The error text `Missing sudo password` in Ansible is the same problem.

## Fix 4: CI (GitHub Actions, GitLab, Jenkins)

GitHub-hosted runners already have passwordless sudo. On self-hosted runners and Jenkins agents, grant the runner user `NOPASSWD` for exactly the commands the pipeline needs (Fix 2), or avoid sudo by running the job in a container or giving the user group permissions (e.g. `docker` group instead of `sudo docker`).

## Fix 5: sudo -S (use with care)

`-S` makes sudo read the password from stdin:

```bash
echo "$SUDO_PASS" | sudo -S -p '' apt-get update
```

This works, but the password ends up in environment variables, shell history or process listings if you're careless. Prefer a NOPASSWD rule or a GUI askpass helper (`SUDO_ASKPASS=/usr/bin/ssh-askpass sudo -A ...`) on desktops.

## Fix 6: don't use sudo where you don't need it

- In a **Dockerfile**, `RUN` steps already run as root unless you set `USER`; drop `sudo`, or put root steps before the `USER` line.
- In **cron**, put root jobs in root's crontab (`sudo crontab -e`) or `/etc/cron.d/` instead of calling sudo from a user crontab.
- For **systemd services**, set `User=` in the unit rather than calling sudo inside `ExecStart`.
