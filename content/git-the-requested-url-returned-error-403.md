---
error: "fatal: unable to access ... The requested URL returned error: 403"
error_full: |
  remote: Permission to user/repo.git denied to other-user.
  fatal: unable to access 'https://github.com/user/repo.git/': The requested URL returned error: 403
cat: git
description: "The server recognised you but refused the request. Usually Git is sending cached credentials for the wrong account, or the token lacks write permission (scope) for that repository."
tldr: "Check which account Git uses (`remote: Permission ... denied to <user>`). Clear the cached credential (`git credential reject` or Windows Credential Manager / macOS Keychain entry for github.com) and log in again with `gh auth login` or a token that has `repo` scope (fine-grained: Contents read and write on that repo)."
keywords: git 403 the requested url returned error 403 permission denied to user github token scope credential manager keychain wrong account push https fine-grained
related: [git-password-authentication-removed, git-permission-denied-publickey, git-failed-to-push-some-refs]
---
## What it means

HTTP 403 Forbidden: authentication worked (otherwise you'd get 401 / `Authentication failed`), but the authenticated identity isn't allowed to do this. GitHub usually prints the account it saw:

```
remote: Permission to acme/api.git denied to old-username.
```

If that username isn't the one you expect, it's a cached-credential problem. If it is the right user, it's a permissions/scope problem.

## Cause 1: cached credentials for another account

Git's credential helper silently reuses the first login it stored for `github.com`. Find the helper:

```bash
git config --show-origin --get-all credential.helper
```

Clear the stored entry:

```bash
printf "protocol=https\nhost=github.com\n\n" | git credential reject
```

Or by OS:

- **Windows:** Control Panel → Credential Manager → Windows Credentials → remove `git:https://github.com`.
- **macOS:** Keychain Access → search `github.com` → delete the internet password. Or `git credential-osxkeychain erase` with the same input as above.
- **Linux (store helper):** edit or delete `~/.git-credentials`.

Next `git push` prompts again. Use a token as the password, or `gh auth login` followed by `gh auth setup-git`.

To use different accounts per repo, include the username in the URL so credentials are stored separately:

```bash
git remote set-url origin https://work-user@github.com/acme/api.git
git config --global credential.useHttpPath true   # optional: per-repo credentials
```

## Cause 2: token without write permission

A token can read a repo but not push. Check:

- **Classic PAT:** needs the `repo` scope for private repos (`public_repo` for public only). Pushing changes to `.github/workflows/` also needs the `workflow` scope.
- **Fine-grained PAT:** must list the repository (or "All repositories") and grant **Contents: Read and write**. Its resource owner must be the org that owns the repo, and some orgs require admin approval of fine-grained tokens.
- **Expired or revoked token:** GitHub usually answers 401/`Authentication failed`, but replace it anyway.

Test what the token can do:

```bash
curl -s -H "Authorization: Bearer $TOKEN" https://api.github.com/repos/acme/api | grep -A4 '"permissions"'
```

`"push": true` must be there.

## Cause 3: you really have no write access

You're a reader on the repo, or it's someone else's project. Either ask for write access, or fork it and push to your fork:

```bash
gh repo fork --remote
git push -u origin my-branch
```

Then open a pull request.

## Cause 4: organisation SAML SSO

For orgs with SAML single sign-on, a token must be authorised for the org: GitHub → Settings → Developer settings → Tokens → **Configure SSO** → Authorize next to the organisation. SSH keys need the same step.

## Cause 5: GitHub Actions `GITHUB_TOKEN`

In workflows, `git push` with the default token fails with 403 when it is read-only:

```yaml
permissions:
  contents: write
```

Also check **Settings → Actions → General → Workflow permissions** for the repository or org.

## Other hosts

- **GitLab:** 403 often means the token lacks `write_repository`, or the branch is protected.
- **Azure DevOps / Bitbucket:** PAT needs Code (Read & write) / repository write. App passwords on Bitbucket are being replaced by API tokens.

## Switch to SSH to avoid credential confusion

```bash
git remote set-url origin git@github.com:acme/api.git
ssh -T git@github.com     # shows which account the key belongs to
```
