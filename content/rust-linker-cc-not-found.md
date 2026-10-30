---
error: "error: linker `cc` not found"
error_full: |
  error: linker `cc` not found
    |
    = note: No such file or directory (os error 2)

  error: could not compile `hello` (bin "hello") due to 1 previous error
cat: rust
description: rustc compiles your code itself but uses the system C toolchain to link the final binary. No C compiler/linker (cc) is installed, so linking fails. Install build-essential (Debian/Ubuntu), gcc (Fedora/Arch/Alpine) or Xcode Command Line Tools (macOS).
tldr: "Debian/Ubuntu/WSL: `sudo apt update && sudo apt install build-essential`. Fedora: `sudo dnf install gcc`. Arch: `sudo pacman -S base-devel`. Alpine: `apk add build-base`. macOS: `xcode-select --install`. Then run `cargo build` again. On Windows `link.exe not found` needs the Visual Studio C++ Build Tools."
keywords: rust error linker cc not found no such file or directory os error 2 cargo build build-essential gcc xcode-select link.exe not found msvc wsl docker cross compile
related: [linux-command-not-found, python-microsoft-visual-cpp-required, rust-borrow-of-moved-value]
---
## What it means

`rustup` installs the Rust compiler and standard library, but not a linker. On Linux and macOS, rustc invokes `cc` (the system C compiler driver) to link object files into an executable. If `cc` isn't on your `PATH`, you get this error at the end of `cargo build` — your code compiled fine.

Check:

```bash
which cc gcc clang
```

## Fix 1: Debian, Ubuntu, WSL

```bash
sudo apt update
sudo apt install build-essential
```

`build-essential` provides `gcc`, `make`, libc headers and the `cc` symlink. Fresh WSL distributions and minimal cloud images don't include it.

## Fix 2: other Linux distributions

```bash
sudo dnf install gcc            # Fedora, RHEL, Rocky, Alma
sudo pacman -S base-devel       # Arch, Manjaro
sudo zypper install gcc         # openSUSE
apk add build-base              # Alpine
```

## Fix 3: macOS

```bash
xcode-select --install
```

This installs the Command Line Tools (clang, ld, and the `cc` shim). After a macOS upgrade the tools sometimes break; reinstall with the same command, or reset with `sudo xcode-select --reset`.

## Fix 4: Docker images

Use the official image, which already includes gcc:

```dockerfile
FROM rust:1 AS build
WORKDIR /app
COPY . .
RUN cargo build --release
```

On a slim or custom base, install the toolchain in the build stage:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
```

For `rust:alpine`, add `RUN apk add --no-cache musl-dev` (or `build-base`), otherwise you'll see linker or missing `crt1.o` errors.

## Fix 5: Windows (`link.exe` not found)

The MSVC target (`x86_64-pc-windows-msvc`, the default) needs Microsoft's linker. Install **Visual Studio Build Tools** with the **Desktop development with C++** workload (it includes MSVC and the Windows SDK), then open a new terminal. The alternative is the GNU target:

```powershell
rustup toolchain install stable-x86_64-pc-windows-gnu
```

which also needs a MinGW-w64 toolchain.

## Fix 6: cross-compiling

When building for another target (e.g. `aarch64-unknown-linux-gnu`), the host `cc` can't link for that architecture. Install a cross linker and tell Cargo to use it in `.cargo/config.toml`:

```toml
[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"
```

```bash
sudo apt install gcc-aarch64-linux-gnu
rustup target add aarch64-unknown-linux-gnu
cargo build --target aarch64-unknown-linux-gnu
```

Tools like `cross` (Docker-based) or `cargo zigbuild` avoid installing per-target toolchains.

## If gcc is installed but `cc` isn't

Some setups have `gcc` or `clang` but no `cc` symlink. Point Cargo at the one you have, either per target in `.cargo/config.toml` (`linker = "gcc"`) or for one build:

```bash
RUSTFLAGS="-C linker=clang" cargo build
```
