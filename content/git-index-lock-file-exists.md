---
error: "fatal: Unable to create '.git/index.lock': File exists."
error_full: |
  fatal: Unable to create '/home/me/project/.git/index.lock': File exists.

  Another git process seems to be running in this repository, e.g.
  an editor opened by 'git commit'. Please make sure all processes
  are terminated then try again. If it still fails, a git process
  may have crashed in this repository earlier:
  remove the file manually to continue.
cat: git
description: Git found a leftover lock file from another (or crashed) git process. Make sure no git process is running, then delete .git/index.lock.
tldr: "Close editors/IDEs running git, check `ps aux | grep git`, then remove the stale lock: `rm -f .git/index.lock` (Windows: `del .git\\index.lock`)."
keywords: git index.lock file exists unable to create another git process seems to be running remove lock
related: [git-not-a-git-repository, git-your-local-changes-would-be-overwritten]
---
## What it means

Git writes `.git/index.lock` while it modifies the index (staging area) so two processes can't corrupt it at once. When the process finishes, the lock is deleted. If git crashed, was killed, or another tool is running git in the background, the lock stays and every new command refuses to run.

## Fix

1. **Check nothing is still running.** Common culprits: an open `git commit` editor, VS Code / JetBrains source control, GitHub Desktop, a `git gc` in the background.

   ```bash
   ps aux | grep -i git
   ```

2. **Remove the stale lock:**

   ```bash
   rm -f .git/index.lock
   ```

   Windows (cmd / PowerShell):

   ```powershell
   del .git\index.lock
   Remove-Item .git\index.lock
   ```

3. Run your command again.

## Other lock files

The same message can name a different file, e.g. `.git/refs/heads/main.lock`, `.git/HEAD.lock` or `.git/config.lock`. The fix is identical: make sure git isn't running, then delete the named `.lock` file.

## It keeps coming back

- An IDE is polling git constantly. Disable its git auto-fetch/auto-refresh, or close it while doing big operations like rebases.
- The repo is inside a synced folder (Dropbox, OneDrive, iCloud). Sync clients lock or restore files mid-operation; move the repo out of the synced folder.
- Antivirus scanning `.git` on Windows; add an exclusion for your source folder.
