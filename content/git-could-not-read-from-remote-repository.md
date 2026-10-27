---
error: "fatal: Could not read from remote repository."
error_full: |
  fatal: Could not read from remote repository.

  Please make sure you have the correct access rights
  and the repository exists.
cat: git
description: Git couldn't reach or authenticate to the remote. Usually a wrong remote URL, a missing SSH key, or no access to the repository.
tldr: "Check the URL with `git remote -v`, test SSH with `ssh -T git@github.com`, and confirm the repository exists and you have access."
keywords: git clone push pull could not read from remote repository correct access rights repository exists
related: [git-permission-denied-publickey, ssh-permission-denied-publickey]
---
## What it means

This is a generic message: Git asked the remote for data and the connection or login failed. **The line just above it** tells you the real cause.

| Line above the error | Go to |
|---|---|
| `Permission denied (publickey)` | Your SSH key isn't accepted. See [Permission denied (publickey)](/git/git-permission-denied-publickey/). |
| `ERROR: Repository not found.` | Wrong URL, a private repo you can't access, or a renamed repo |
| `ssh: connect to host github.com port 22: Connection timed out` | Port 22 is blocked. Use SSH over port 443 or HTTPS. |
| `Host key verification failed.` | The host isn't in `known_hosts`. Run `ssh -T git@github.com` and accept the key after checking its fingerprint. |

## Check the remote URL

```bash
git remote -v
```

Fix a wrong URL:

```bash
git remote set-url origin git@github.com:USER/REPO.git
```

## Test SSH directly

```bash
ssh -vT git@github.com
```

The verbose output shows which keys are tried and why they are rejected.

## Switch to HTTPS instead

```bash
git remote set-url origin https://github.com/USER/REPO.git
```

GitHub no longer accepts account passwords over HTTPS, so use a personal access token or a credential helper such as Git Credential Manager or `gh auth login`.
