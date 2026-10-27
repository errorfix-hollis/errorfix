---
error: "remote: Support for password authentication was removed"
error_full: |
  remote: Support for password authentication was removed on August 13, 2021.
  remote: Please see https://docs.github.com/get-started/getting-started-with-git/about-remote-repositories#cloning-with-https-urls for information on currently recommended modes of authentication.
  fatal: Authentication failed for 'https://github.com/user/repo.git/'
cat: git
description: GitHub no longer accepts your account password for Git over HTTPS. Use a personal access token, the GitHub CLI, or SSH.
tldr: "Easiest: install the GitHub CLI and run `gh auth login`. Or create a personal access token (GitHub → Settings → Developer settings → Tokens) and paste it when Git asks for a password."
keywords: github password authentication removed authentication failed https personal access token pat gh auth login credential helper
related: [git-permission-denied-publickey, git-could-not-read-from-remote-repository]
---
## What it means

When Git asks for "Password" over HTTPS, GitHub only accepts a **token**, not the password you use on the website.

## Fix 1: GitHub CLI (simplest)

```bash
gh auth login        # choose GitHub.com → HTTPS → authenticate in the browser
gh auth setup-git    # makes git use gh's credentials
```

## Fix 2: personal access token

1. GitHub → **Settings → Developer settings → Personal access tokens**.
2. Create a **fine-grained** token limited to the repositories you need, with *Contents: Read and write* (add *Workflows* if you edit `.github/workflows`). A classic token needs the `repo` scope.
3. Run your `git push` again. Username: your GitHub username. Password: **paste the token**.

Save it so you're not asked every time:

```bash
git config --global credential.helper store      # plain text in ~/.git-credentials
# better on macOS: osxkeychain; on Windows: Git Credential Manager (installed with Git for Windows)
```

## Fix 3: switch to SSH

```bash
git remote set-url origin git@github.com:USER/REPO.git
```

You'll need an SSH key added to your account. See [Permission denied (publickey)](/git/git-permission-denied-publickey/).

## An old password is cached

If Git doesn't ask and just fails, an old password is stored in your credential manager.

- **macOS:** open Keychain Access, search `github.com`, delete the entry.
- **Windows:** Control Panel → Credential Manager → Windows Credentials → remove `git:https://github.com`.
- **Linux (store helper):** edit or delete `~/.git-credentials`.

Then push again and enter the token.
