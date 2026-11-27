---
error: "fatal: unable to access: The requested URL returned error: 401"
error_full: |
  remote: Support for password authentication was removed on August 13, 2021.
  fatal: unable to access 'https://github.com/user/repo.git/': The requested URL returned error: 401
cat: git
description: "The Git host rejected your HTTPS credentials as missing or invalid: a wrong or expired token, an account password where a token is required, or a stale entry in the credential helper."
tldr: "Clear the cached credential (`git credential reject` with `protocol=https` and `host=github.com`, or remove it in Windows Credential Manager / macOS Keychain), then push again and enter your username plus a Personal Access Token as the password. Or use `gh auth login`, or switch the remote to SSH."
keywords: git the requested url returned error 401 unauthorized fatal unable to access https personal access token expired credential manager github gitlab azure devops bitbucket
related: [git-the-requested-url-returned-error-403, git-fatal-authentication-failed, git-password-authentication-removed]
---
## What it means

HTTP 401 means **Unauthorized**: the server did not accept the credentials Git sent (or Git sent none). This is different from 403, where the server knows who you are but you don't have permission on the repository.

See what Git is sending:

```bash
GIT_CURL_VERBOSE=1 GIT_TRACE=1 git ls-remote https://github.com/user/repo.git 2>&1 | grep -iE 'authorization|HTTP/'
git config --get-all credential.helper
```

## Cause 1: a stale or expired credential is cached

The credential helper keeps sending an old password or a token that has expired or been revoked, so you never get a prompt. Remove it:

```bash
printf "protocol=https\nhost=github.com\n\n" | git credential reject
```

- **Windows**: Control Panel → Credential Manager → Windows Credentials → remove `git:https://github.com`.
- **macOS**: Keychain Access → search `github.com` → delete the internet password, or `printf "protocol=https\nhost=github.com\n\n" | git credential-osxkeychain erase`.
- **Linux with `store`**: edit or delete the line in `~/.git-credentials`.

Then run `git push` again and enter fresh credentials.

## Cause 2: using your account password

GitHub, GitLab.com and Bitbucket Cloud no longer accept account passwords for Git over HTTPS. Create a token and use it as the password:

- GitHub: Settings → Developer settings → Personal access tokens. A classic token needs the `repo` scope; a fine-grained token needs **Contents: Read and write** on that repository.
- GitLab: User settings → Access tokens, scopes `read_repository` / `write_repository`.
- Bitbucket: an app password or API token with repository permissions.
- Azure DevOps: a PAT with Code (Read & write).

Easiest on GitHub: let the CLI set things up:

```bash
gh auth login        # choose HTTPS, then "Login with a web browser"
gh auth setup-git
```

## Cause 3: credentials in the remote URL are wrong

An old token embedded in the URL overrides the helper:

```bash
git remote -v
# https://olduser:ghp_xxx@github.com/user/repo.git
git remote set-url origin https://github.com/user/repo.git
```

## Cause 4: SSO or organization policies

If the organization uses SAML SSO, a token must be authorized for that org (GitHub: Settings → Tokens → Configure SSO → Authorize). Fine-grained tokens must also be approved if the org requires it.

## Cause 5: CI pipelines

In CI, 401 usually means the token variable is empty or masked incorrectly. In GitHub Actions use `${{ secrets.GITHUB_TOKEN }}` and check `permissions: contents: write`; in GitLab CI use `CI_JOB_TOKEN` or a project access token.

## Alternative: use SSH

```bash
git remote set-url origin git@github.com:user/repo.git
ssh -T git@github.com
```

SSH bypasses HTTP authentication completely, once your public key is added to your account.
