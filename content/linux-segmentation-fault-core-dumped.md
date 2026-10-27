---
error: "Segmentation fault (core dumped)"
cat: linux
description: The program accessed memory it wasn't allowed to and the kernel killed it. Get a backtrace with gdb or the core dump to find where.
tldr: "Run the program under a debugger: `gdb --args ./program args`, type `run`, and after the crash `bt` for the backtrace. For a past crash on systemd systems: `coredumpctl gdb`."
keywords: segmentation fault core dumped sigsegv linux c c++ python gdb backtrace coredumpctl ulimit valgrind address sanitizer
related: [linux-command-not-found]
---
## What it means

The process tried to read or write memory that isn't mapped for it (a null or dangling pointer, a buffer overflow, a stack overflow from deep recursion). The kernel sent it `SIGSEGV`, and the shell printed this message. Exit code 139 (128 + 11) means the same thing.

## Find where it crashed

**Run it under gdb:**

```bash
gdb --args ./program arg1 arg2
(gdb) run
(gdb) bt
```

Compile your own code with debug info (`-g`, and preferably `-O0`) so the backtrace has file names and line numbers.

**Use the core dump** (systemd-coredump on Ubuntu/Fedora/Arch):

```bash
coredumpctl list
coredumpctl gdb        # opens the most recent crash
```

Without systemd-coredump, enable core files first: `ulimit -c unlimited`, then rerun.

## Catch the bug at its source

AddressSanitizer reports the exact bad access, often before it turns into a segfault:

```bash
gcc -g -fsanitize=address,undefined program.c -o program
./program
```

Valgrind works without recompiling: `valgrind ./program`.

## Python, Node or another interpreter segfaults

Pure Python code can't segfault, so the crash is in a native extension (numpy, torch, opencv, a database driver…) or the interpreter itself.

```bash
python -X faulthandler script.py
```

prints the Python stack at the crash. Common fixes: upgrade the extension, make sure packages are built for the same Python and architecture, or avoid mixing pip and conda builds of the same library.

## Deep recursion

A very deep recursion can overflow the stack. Rewrite as a loop, or raise the stack limit for testing: `ulimit -s unlimited`.
