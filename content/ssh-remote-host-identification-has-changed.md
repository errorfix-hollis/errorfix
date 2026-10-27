---
error: "WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!"
error_full: |
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  @    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
  Host key verification failed.
cat: ssh
description: The server's host key differs from the one saved in known_hosts. If you know why (reinstalled server, new IP owner), remove the old key with ssh-keygen -R.
tldr: "If the server was rebuilt or the IP reused, run `ssh-keygen -R hostname` (or the IP), then connect again and verify the new fingerprint. If you don't know why it changed, stop and investigate."
keywords: remote host identification has changed known_hosts host key verification failed ssh-keygen -R man in the middle
related: [ssh-permission-denied-publickey]
---
## What it means

The first time you connected, SSH saved the server's host key in `~/.ssh/known_hosts`. This time the server presented a **different** key. That's what a man-in-the-middle attack looks like, so SSH refuses to connect.

## Harmless reasons

- The server was reinstalled or rebuilt (new host keys are generated).
- A cloud IP address or hostname now points to a different machine.
- A router, Raspberry Pi or VM got a new DHCP address that previously belonged to another device.

If one of these applies, you can safely replace the stored key.

## Fix

```bash
ssh-keygen -R server.example.com
ssh-keygen -R 203.0.113.10        # also remove the IP entry if you connect by IP
ssh user@server.example.com
```

SSH then shows the new fingerprint and asks you to confirm. If possible, compare it with the fingerprint printed on the server's console:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub     # run on the server
```

For a non-standard port: `ssh-keygen -R '[server.example.com]:2222'`.

## Don't do this

Disabling the check (`StrictHostKeyChecking no`, `UserKnownHostsFile /dev/null`) hides real attacks. It's acceptable for short-lived test VMs, not for real servers.

## GitHub

GitHub rotated its RSA host key in March 2023. If you see this error for `github.com`, run `ssh-keygen -R github.com` and reconnect; the new fingerprints are listed in GitHub's documentation.
