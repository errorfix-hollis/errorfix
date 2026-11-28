---
error: "version `GLIBC_2.34' not found"
error_full: |
  ./myapp: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.34' not found (required by ./myapp)
  ./myapp: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.32' not found (required by ./myapp)
cat: linux
description: "The binary was built against a newer GNU C library (glibc) than the one installed on this system. glibc is backward compatible only: programs built on an older glibc run on newer systems, not the other way round."
tldr: "Check your version with `ldd --version`. Then get a build made for your glibc (an older-distro, `musl` or static release), rebuild on the oldest system you need to support (e.g. inside an older distro container), run it in a container with a newer distro, or upgrade the OS. Never replace the system glibc manually."
keywords: linux version glibc_2.34 not found glibc_2.28 glibc_2.32 required by libc.so.6 ldd --version objdump old distro centos 7 ubuntu 20.04 musl static binary node rust go cgo
related: [linux-cannot-execute-binary-file, docker-exec-format-error, linux-bad-interpreter-no-such-file]
---
## What it means

Almost every Linux program links to glibc (`libc.so.6`). glibc uses symbol versioning: a program compiled on a system with glibc 2.34 may require symbols tagged `GLIBC_2.34`, which an older glibc (say 2.31 on Ubuntu 20.04) doesn't have. The loader refuses to start the program.

Compare what you have with what the binary needs:

```bash
ldd --version | head -1
# ldd (Ubuntu GLIBC 2.31-0ubuntu9) 2.31

objdump -T ./myapp | grep -o 'GLIBC_[0-9.]*' | sort -uV | tail -1
# GLIBC_2.34
```

Some reference points: Ubuntu 20.04 has 2.31, Ubuntu 22.04 has 2.35, Debian 11 has 2.31, Debian 12 has 2.36, RHEL/CentOS 7 has 2.17, RHEL 8 has 2.28.

## Fix 1: download a build for your system

Many projects publish several Linux builds. Look for:

- a `musl` build (`x86_64-unknown-linux-musl`, `linux-musl`): statically linked, no glibc dependency;
- a build marked for older distributions or a specific glibc;
- a distro package (`apt`, `dnf`) built for your release, or an older release of the tool.

Python wheels encode this in the name: `manylinux_2_28` needs glibc 2.28 or newer, `manylinux2014` needs 2.17. pip picks a compatible wheel automatically if one exists; if not, it builds from source.

## Fix 2: build on the oldest system you target

If it's your software, compile on the oldest distro you need to support, e.g. in a container:

```bash
docker run --rm -v "$PWD":/src -w /src debian:11 bash -c 'apt-get update && apt-get install -y build-essential && make'
```

Language-specific options:

```bash
# Go: pure-Go binaries without cgo don't link glibc at all
CGO_ENABLED=0 go build -o myapp .

# Rust: static musl binary
rustup target add x86_64-unknown-linux-musl
cargo build --release --target x86_64-unknown-linux-musl

# Rust: target a specific glibc with cargo-zigbuild
cargo zigbuild --release --target x86_64-unknown-linux-gnu.2.17
```

## Fix 3: run it in a container

If you can't rebuild, run the program in a container whose distro has a new enough glibc:

```bash
docker run --rm -v "$PWD":/work -w /work ubuntu:24.04 ./myapp
```

## Fix 4: upgrade the OS

When many tools start failing this way (for example official Node.js 18+ binaries need glibc 2.28, so they don't run on CentOS 7), the system is simply too old. Upgrading the distribution release is the durable fix.

## Do not replace the system glibc

Copying a newer `libc.so.6` into `/lib` or installing glibc from source over the system one breaks every program on the machine, including `ls` and `sudo`, and can leave the system unbootable. If you truly need a second glibc, install it in a separate prefix and start the program through that loader, which is fragile; prefer Fixes 1 to 3.

## Related: "No such file or directory" for an existing file

If running `./myapp` says `No such file or directory` although the file exists, the binary's ELF interpreter (e.g. `/lib64/ld-linux-x86-64.so.2`, or musl's loader) is missing. Check with `file ./myapp`.
