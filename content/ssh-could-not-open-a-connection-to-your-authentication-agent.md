---
error: "Could not open a connection to your authentication agent."
error_full: |
  $ ssh-add ~/.ssh/id_ed25519
  Could not open a connection to your authentication agent.
cat: ssh
description: "ssh-add could not reach a running ssh-agent, because no agent is running in this session or the SSH_AUTH_SOCK variable is missing or points to a dead socket. Start an agent in the current shell, then add your key."
tldr: "Start the agent in the current shell and add the key: `eval \"$(ssh-agent -s)\"` then `ssh-add ~/.ssh/id_ed25519`. On Windows (PowerShell as admin): `Get-Service ssh-agent | Set-Service -StartupType Automatic` and `Start-Service ssh-agent`. Add `AddKeysToAgent yes` to `~/.ssh/config` to load keys automatically."
keywords: ssh-add could not open a connection to your authentication agent ssh-agent eval ssh-agent -s SSH_AUTH_SOCK error connecting to agent no such file or directory windows openssh service git bash tmux
related: [ssh-permission-denied-publickey, git-permission-denied-publickey, ssh-unprotected-private-key-file]
---
## What it means

`ssh-add` talks to `ssh-agent` through a Unix socket whose path is in the `SSH_AUTH_SOCK` environment variable (on Windows, through a named pipe). This message means that variable is unset, or nothing is listening on it. Newer OpenSSH versions word the same problem as `Error connecting to agent: No such file or directory` or `Connection refused`.

Check:

```bash
echo "$SSH_AUTH_SOCK"
ssh-add -l     # "The agent has no identities." = agent OK, just empty
```

## Fix 1: start an agent in this shell (Linux, macOS, Git Bash, WSL)

Running `ssh-agent` on its own only prints the variables; they must be set in your current shell, which is what `eval` does:

```bash
eval "$(ssh-agent -s)"
# Agent pid 12345
ssh-add ~/.ssh/id_ed25519
```

The agent lives as long as that session. To avoid repeating it, either let SSH add keys on first use:

```sshconfig
# ~/.ssh/config
Host *
    AddKeysToAgent yes
```

or start the agent from your shell startup file only when none is reachable:

```bash
# ~/.bashrc
ssh-add -l >/dev/null 2>&1
if [ $? -eq 2 ]; then
    eval "$(ssh-agent -s)" >/dev/null
fi
```

(`ssh-add -l` exits with 2 when it can't reach an agent, 1 when the agent has no keys.) Desktop sessions on most Linux distributions and macOS already start an agent, so this mainly matters on servers, WSL and minimal setups.

## Fix 2: Windows OpenSSH (PowerShell / cmd)

Windows ships `ssh-agent` as a service that is disabled by default. In an elevated PowerShell:

```powershell
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
```

Then, in a normal shell:

```powershell
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

Git for Windows has its own OpenSSH. If Git uses that one while you loaded keys into the Windows agent, point Git at the Windows client:

```powershell
git config --global core.sshCommand "C:/Windows/System32/OpenSSH/ssh.exe"
```

## Fix 3: stale socket in tmux/screen or after reconnecting

A tmux session keeps the `SSH_AUTH_SOCK` of the login that created it. After you log out and back in, the old socket is gone. Inside tmux:

```bash
eval "$(tmux show-environment -s SSH_AUTH_SOCK)"
```

or start a new agent with Fix 1.

## Fix 4: sudo or a different user

`sudo` strips most environment variables, so `sudo ssh-add` (or `sudo git pull` with SSH) can't see your agent, and root can't use your user's socket anyway. Run Git and ssh-add as your own user; if you must, `sudo --preserve-env=SSH_AUTH_SOCK command` passes the variable through.

## Fix 5: agent forwarding

On a remote host reached with `ssh -A`, `SSH_AUTH_SOCK` is set only if forwarding is allowed: `ForwardAgent yes` on the client side for that host and `AllowAgentForwarding yes` (the default) on the server. Only forward your agent to hosts you trust.

## You may not need the agent

The agent only saves you from typing a passphrase repeatedly. `ssh -i ~/.ssh/id_ed25519 host`, or an `IdentityFile` line in `~/.ssh/config`, works without one.
