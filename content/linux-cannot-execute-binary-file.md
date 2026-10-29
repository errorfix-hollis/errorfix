---
error: "cannot execute binary file: Exec format error"
error_full: |
  bash: ./app: cannot execute binary file: Exec format error
cat: linux
description: The file is a program built for a different CPU architecture or OS (e.g. x86_64 binary on an ARM Raspberry Pi/Apple Silicon VM, or a macOS/Windows binary on Linux), or you're running a non-binary file as one.
tldr: "Compare `file ./app` with `uname -m`. Download the build for your architecture (x86_64/amd64 vs aarch64/arm64), or rebuild from source. Scripts need a shebang line like `#!/bin/bash`."
keywords: cannot execute binary file exec format error linux arm64 aarch64 x86_64 amd64 raspberry pi file command uname wrong architecture
related: [linux-bad-interpreter-no-such-file, docker-exec-format-error, linux-permission-denied-running-script]
---
## What it means

The kernel looked at the file's header and couldn't run it on this machine.

Check both sides:

```bash
uname -m        # x86_64, aarch64, armv7l ...
file ./app
```

Examples of `file` output:

- `ELF 64-bit LSB executable, x86-64` → needs `x86_64`
- `ELF 64-bit LSB executable, ARM aarch64` → needs `aarch64`
- `Mach-O 64-bit executable arm64` → a macOS binary; won't run on Linux at all
- `PE32+ executable (console) x86-64, for MS Windows` → a Windows `.exe`

## Fix 1: download the right build

Release pages usually offer `linux-amd64` / `linux-x86_64` and `linux-arm64` / `linux-aarch64` variants. Raspberry Pi OS 32-bit needs `armv7`/`armhf` builds; 64-bit Pi OS needs `arm64`.

## Fix 2: build from source

```bash
go build ./...            # Go builds for the current machine
cargo build --release     # Rust
```

Cross-compiling for another target: `GOOS=linux GOARCH=arm64 go build`, or `cargo build --target aarch64-unknown-linux-gnu`.

## Fix 3: run under emulation

Install QEMU user-mode emulation (slow, but works for occasional use):

```bash
sudo apt install qemu-user-static binfmt-support
./app
```

## Fix 4: it's not a binary

- Running a text script with `./script.sh` and no shebang can fail this way under some shells; add `#!/bin/bash` as the first line.
- A corrupted or incomplete download (an HTML error page saved as `app`) gives the same error. Check with `file` and `head -c 200 app`.
- `bash ./app` on a binary gives `cannot execute binary file` too — run it directly with `./app`.
