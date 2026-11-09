---
error: "xcrun: error: invalid active developer path (/Library/Developer/CommandLineTools), missing xcrun"
error_full: |
  xcrun: error: invalid active developer path (/Library/Developer/CommandLineTools), missing xcrun at: /Library/Developer/CommandLineTools/usr/bin/xcrun
cat: git
description: "On macOS, git, make, gcc and clang are shims that call the Xcode Command Line Tools. After a macOS upgrade (or if they were never installed) the tools are missing, so every one of those commands fails with this message."
tldr: "Reinstall the Command Line Tools: `xcode-select --install` and accept the dialog. If it says they're already installed, reset them: `sudo rm -rf /Library/Developer/CommandLineTools && xcode-select --install`. If you have full Xcode, point to it instead: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`."
keywords: xcrun error invalid active developer path missing xcrun macos git not working after update xcode-select --install command line tools sonoma sequoia make gcc clang
related: [git-not-a-git-repository, linux-command-not-found, npm-gyp-err-find-python]
---
## What it means

On macOS, `/usr/bin/git`, `/usr/bin/make`, `/usr/bin/clang`, `/usr/bin/python3` and friends are small stubs. They ask `xcrun` to find the real tool in the *active developer directory* — either the Command Line Tools (`/Library/Developer/CommandLineTools`) or Xcode. If that directory is missing or incomplete, you get this error from every tool.

It almost always appears right after a **major macOS upgrade** (the installer removes or invalidates the Command Line Tools), or on a fresh Mac. Your repositories are fine; only the tools are missing.

Check the current setting:

```bash
xcode-select -p
```

## Fix 1: install the Command Line Tools

```bash
xcode-select --install
```

A dialog appears; click **Install** and accept the licence. It downloads a few hundred MB. Afterwards:

```bash
git --version
```

## Fix 2: "command line tools are already installed"

If `xcode-select --install` says they're installed but the error persists, the install is broken. Remove and reinstall:

```bash
sudo rm -rf /Library/Developer/CommandLineTools
xcode-select --install
```

If the dialog doesn't appear or the download fails ("not currently available from the Software Update server"), download **Command Line Tools for Xcode** for your macOS version from developer.apple.com/download/all (free Apple ID needed) and run the `.pkg`. Or use Software Update:

```bash
softwareupdate --list
softwareupdate --install "Command Line Tools for Xcode-16.0"   # use the exact label from --list
```

## Fix 3: you have full Xcode installed

Point the active developer directory at Xcode instead:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

If you previously pointed to Xcode and then deleted or renamed it (e.g. `Xcode-beta.app`), reset to the default:

```bash
sudo xcode-select --reset
```

## Fix 4: use Homebrew's git (doesn't remove the need for CLT)

`brew install git` gives you a git that doesn't go through the `/usr/bin` stub, and makes sure your `PATH` puts `/opt/homebrew/bin` (Apple Silicon) or `/usr/local/bin` (Intel) first. Note that Homebrew itself requires the Command Line Tools, so do Fix 1 anyway.

## IDEs and GUI apps

VS Code, JetBrains IDEs, SourceTree and GitHub Desktop that use the system git show the same error, often as "git not found" or "xcrun: error". Fix it in Terminal with the steps above, then restart the app.

## Related errors after the fix

- `xcrun: error: unable to find utility "xctest"` / `"simctl"` — those need full Xcode, not just the Command Line Tools (Fix 3).
- node-gyp build failures (`gyp: No Xcode or CLT version detected!`) — same fix; reinstall CLT, then `npm rebuild`.
- `You have not agreed to the Xcode license agreements` — run `sudo xcodebuild -license accept`.
