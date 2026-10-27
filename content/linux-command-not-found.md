---
error: "command not found"
error_full: "bash: somecommand: command not found"
cat: linux
description: The shell can't find a program with that name in any PATH directory. Install it, fix the PATH, or use the full path.
tldr: "Check if it's installed with `type somecommand`. If not, install it (Ubuntu suggests the package). If it's installed somewhere like `~/.local/bin`, add that folder to PATH in `~/.bashrc`."
keywords: command not found bash zsh path linux install export path local bin npm global
related: [python-pip-command-not-found, linux-permission-denied-running-script]
---
## What it means

When you type a command, the shell searches the directories listed in `$PATH`, in order. None of them contains an executable with that name.

## Step 1: is it a typo?

Commands are case-sensitive. `Git` is not `git`.

## Step 2: is it installed?

```bash
type somecommand
which -a somecommand
```

On Ubuntu/Debian, the "command not found" message often suggests a package. Otherwise search for it:

```bash
apt search somecommand          # Debian/Ubuntu
dnf provides '*/somecommand'    # Fedora/RHEL
brew search somecommand         # macOS
```

## Step 3: installed, but not on PATH

Tools installed by pip (`--user`), pipx, npm (global), cargo, go or a manual download often live in folders not on PATH by default:

| Installed by | Folder |
|---|---|
| pip --user / pipx | `~/.local/bin` |
| npm -g (custom prefix) | `~/.npm-global/bin` |
| cargo | `~/.cargo/bin` |
| go install | `~/go/bin` |

Add the folder to PATH (bash: `~/.bashrc`, zsh: `~/.zshrc`):

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Step 4: it works in one terminal but not another

- You installed it in this session and the shell cached the old PATH: run `hash -r` or open a new terminal.
- **sudo** uses a restricted PATH (`secure_path`), so `sudo mytool` may fail even though `mytool` works. Use the full path: `sudo "$(which mytool)"`.
- **cron** and **systemd** jobs run with a minimal PATH. Use absolute paths in those scripts.

## Running a file in the current directory

The current folder is not on PATH. Run it as `./myscript`, not `myscript`.
