---
error: "Bad configuration option"
error_full: |
  /home/me/.ssh/config: line 7: Bad configuration option: usekeychain
  /home/me/.ssh/config: terminating, 1 bad configuration options
cat: ssh
description: "The OpenSSH client found a keyword in ~/.ssh/config (or /etc/ssh/ssh_config) that it doesn't recognise, usually a macOS-only option like UseKeychain, a typo, a server-only (sshd_config) option, or an option your SSH version is too old or too new for."
tldr: "Open the file and line from the message. For `UseKeychain` on non-macOS clients, add `IgnoreUnknown UseKeychain` at the top of `~/.ssh/config` (before any Host block). Fix typos, move sshd-only options to `/etc/ssh/sshd_config`, and check `ssh -V` for version-specific options. Test with `ssh -G host`."
keywords: ssh bad configuration option usekeychain ignoreunknown ssh config terminating bad configuration options sshd_config unsupported option ssh -G pubkeyacceptedkeytypes
related: [ssh-bad-owner-or-permissions-on-ssh-config, ssh-no-matching-host-key-type-found, ssh-permission-denied-publickey]
---
## What it means

`ssh` parses its config before connecting. Any unknown keyword is a fatal error, so the connection never starts, and `git`, `scp`, `rsync` and VS Code Remote fail too. The message names the file, the line number and the option (lowercased). Keywords are case-insensitive; values are not.

A similar message from the server side, `/etc/ssh/sshd_config line N: Bad configuration option`, means `sshd` won't start: check with `sudo sshd -t`.

## Cause 1: `UseKeychain` on Linux, Windows or WSL

`UseKeychain` only exists in Apple's build of OpenSSH. If you copied a macOS config (or share dotfiles), other clients reject it. Tell them to ignore it. `IgnoreUnknown` must come **before** the line that uses the option, so put it at the very top:

```
IgnoreUnknown UseKeychain,AddKeysToAgent

Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
```

## Cause 2: typo or wrong syntax

Common mistakes: `Hostname` vs `HostName` is fine (case-insensitive), but `Host name`, `IdentitiyFile`, `Users` or `Key` are not options. A `=` is optional (`Port=2222` and `Port 2222` both work). Check option names with `man ssh_config`.

Also look for invisible characters from copy-paste (non-breaking spaces, Windows CRLF when the file came from Windows):

```bash
cat -A ~/.ssh/config | sed -n '5,9p'     # ^M or M-BM- shows bad chars
sed -i 's/\r$//' ~/.ssh/config
```

The [line ending / whitespace inspector](/tools/line-ending-whitespace-inspector/) shows the same thing in the browser.

## Cause 3: server options in the client config

Options such as `PermitRootLogin`, `AllowUsers`, `UsePAM`, `MaxAuthTries`, `ClientAliveInterval` and `Subsystem` exist only for the server and belong in `/etc/ssh/sshd_config`. The client-side equivalent of `ClientAliveInterval` is `ServerAliveInterval`.

## Cause 4: SSH version too old or too new

Some options were added or renamed:

- `PubkeyAcceptedAlgorithms` (OpenSSH 8.5+); older clients only know `PubkeyAcceptedKeyTypes`.
- `Include` needs 7.3+, `ProxyJump` 7.3+.
- Removed options like `UseRoaming` or `Protocol` trigger errors or deprecation warnings on newer releases.

```bash
ssh -V
```

If the same config is used across machines, list version-specific options in `IgnoreUnknown`:

```
IgnoreUnknown UseKeychain,PubkeyAcceptedAlgorithms
```

## Cause 5: the error is in an included or system file

The path in the message may be `/etc/ssh/ssh_config` or a file pulled in by `Include` (e.g. `~/.ssh/config.d/work`). Edit that file instead. On Windows the user config is `C:\Users\<you>\.ssh\config`.

## Test the config

`ssh -G` parses the config and prints the effective settings without connecting:

```bash
ssh -G myserver | grep -Ei 'hostname|user|identityfile|port'
```
