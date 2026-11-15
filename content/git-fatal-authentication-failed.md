---
error: "fatal: Authentication failed for 'https://...'"
error_full: |
  remote: Invalid username or password.
  fatal: Authentication failed for 'https://gitlab.com/team/project.git/'

  remote: HTTP Basic: Access denied. If a password was provided for Git authentication, the password was incorrect or you're required to use a token instead of a password.
  fatal: Authentication failed for 'https://gitlab.example.com/team/project.git/'
cat: git
description: "The Git host rejected the credentials sent over HTTPS. Usually a stored password or token is wrong, expired or revoked, or the host requires a token instead of your account password."
tldr: "Clear the stale stored credential (`printf \"protocol=https\\nhost=github.com\\n\\n\" | git credential reject`, or remove it from Windows Credential Manager / macOS Keychain), then push again and enter your username plus a personal access token as the password. Or switch the remote to SSH: `git remote set-url origin git@host:owner/repo.git`."
keywords: git fatal authentication failed for https remote invalid username or password http basic access denied gitlab azure devops bitbucket personal access token credential manager keychain git credential reject
related: [git-password-authentication-removed, git-the-requested-url-returned-error-403, git-permission-denied-publickey]
---
## What it means

The server answered your HTTPS request with "401 Unauthorized" after Git sent a username and password. Git then gives up with `Authentication failed`. The repository exists and you reached the server, but the credentials are wrong for it.

Almost every Git host no longer accepts your account password for Git:

| Host | What to use as the password |
|---|---|
| GitHub | Personal access token, or `gh auth login` (see [password authentication was removed](/git/git-password-authentication-removed/)) |
| GitLab | Personal/project access token with `read_repository` / `write_repository` scope |
| Bitbucket Cloud | An API token (app passwords are being phased out), username = your Bitbucket username |
| Azure DevOps | PAT with **Code (Read & write)** scope, or Git Credential Manager |
| Self-hosted (Gitea, Gerrit, ...) | Usually a token from your user settings |

## Fix 1: clear the stored (stale) credential

The most common case: it used to work, then you changed your password, or the token expired or was revoked. Git keeps sending the old one from the credential helper, so it never asks again.

See which helper is in use:

```bash
git config --show-origin --get-all credential.helper
```

Remove the stored entry for the host:

```bash
printf "protocol=https\nhost=gitlab.com\n\n" | git credential reject
```

Or by OS:

- **Windows:** Control Panel → **Credential Manager** → **Windows Credentials** → remove `git:https://gitlab.com`. With Git Credential Manager you can also run `git credential-manager erase` and feed it the same lines.
- **macOS:** Keychain Access → search for the host → delete the "internet password" entry. Or run `git credential-osxkeychain erase` and feed it the lines above.
- **Linux `store` helper:** edit `~/.git-credentials` and delete the line for the host.

Then run `git fetch`. Git will prompt, and you enter your username and the **token** as the password.

## Fix 2: create a token with the right scope

A token that authenticates but lacks scope gives `403` on some hosts, and `Authentication failed` on others:

- GitLab: **Preferences → Access tokens**, scopes `read_repository` + `write_repository`.
- Azure DevOps: **User settings → Personal access tokens**, scope **Code: Read & write**, correct organization.
- GitHub fine-grained tokens: give the repository access and **Contents: Read and write**.

Check the expiry date. Organizations often enforce short lifetimes.

## Fix 3: wrong username in the URL

If the remote URL contains a username, Git uses it no matter what you type:

```bash
git remote -v
# https://olduser@gitlab.com/team/project.git
git remote set-url origin https://gitlab.com/team/project.git
```

Never put a token in the remote URL. It gets saved in `.git/config` and shows up in logs.

## Fix 4: 2FA, SSO or SAML

With two-factor auth on, passwords never work over HTTPS. Use a token or SSH. On GitHub orgs with SAML SSO, a classic token must also be **authorized for the org** (Settings → Tokens → Configure SSO).

## Fix 5: use SSH instead

```bash
ssh-keygen -t ed25519 -C "you@example.com"
cat ~/.ssh/id_ed25519.pub        # add to the host's SSH keys page
git remote set-url origin git@gitlab.com:team/project.git
ssh -T git@gitlab.com
```

If SSH then fails, see [Permission denied (publickey)](/git/git-permission-denied-publickey/).

## CI pipelines

In CI, `Authentication failed` usually means the token variable is empty (a protected or masked variable not available on this branch), or expired. On GitLab CI, clone with `https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com/group/repo.git`. That job token also needs access granted in the target project's **CI/CD → Job token permissions**.
