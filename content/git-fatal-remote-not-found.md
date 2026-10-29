---
error: "remote: Repository not found. fatal: repository not found"
error_full: |
  remote: Repository not found.
  fatal: repository 'https://github.com/user/repo.git/' not found
cat: git
description: The URL is wrong, or the repository is private and the credentials Git used don't have access. GitHub deliberately reports "not found" instead of "forbidden" for private repos.
tldr: "Check the URL with `git remote -v`. If it's private, make sure you're authenticated as an account with access: clear the cached credential (Windows Credential Manager / macOS Keychain) or switch to SSH: `git remote set-url origin git@github.com:user/repo.git`."
keywords: git remote repository not found fatal github private repo wrong credentials credential manager keychain organization sso token
related: [git-password-authentication-removed, git-permission-denied-publickey, git-could-not-read-from-remote-repository]
---
## What it means

The server said the repository doesn't exist **for you**. For private repositories, GitHub, GitLab and Bitbucket return "not found" when you lack access so they don't reveal that it exists.

## Cause 1: wrong URL

```bash
git remote -v
```

Look for typos, wrong owner/organization, a renamed or transferred repo, or a missing `.git`. Fix it:

```bash
git remote set-url origin https://github.com/owner/repo.git
```

## Cause 2: cached credentials for a different account

You have two GitHub accounts (work/personal), and Git keeps sending the wrong one.

- **Windows**: Control Panel → Credential Manager → Windows Credentials → remove entries for `git:https://github.com`.
- **macOS**: Keychain Access → search `github.com` → delete the internet password. Or:

  ```bash
  printf "protocol=https\nhost=github.com\n" | git credential-osxkeychain erase
  ```

- **Linux / any**: `git credential reject` with the same input, or check `~/.git-credentials`.

Next push will prompt again. Use a personal access token as the password.

You can also pin the user in the URL: `https://yourname@github.com/owner/repo.git`.

## Cause 3: token without the right access

- Classic tokens need the `repo` scope for private repositories.
- Fine-grained tokens must explicitly include the repository (and the organization must allow fine-grained tokens).
- Organizations with SAML SSO require you to **authorize** the token or SSH key for that org (Settings → Developer settings → Tokens → Configure SSO).

## Cause 4: you haven't been added yet

Ask the owner to add you as a collaborator and accept the email invitation; access doesn't start until you accept.

## Cause 5: the repo doesn't exist yet

Create it on GitHub first (or with `gh repo create`), then push.
