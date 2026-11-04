---
error: "Argument list too long"
error_full: |
  bash: /usr/bin/rm: Argument list too long
  -bash: /bin/ls: Argument list too long
  OSError: [Errno 7] Argument list too long
cat: linux
description: A glob like `*.log` expanded to so many filenames that the command line exceeded the kernel's ARG_MAX limit (E2BIG). Use find, xargs or a loop instead of passing all files as arguments.
tldr: "Don't pass the glob to the command; let find do it: `find . -maxdepth 1 -name '*.log' -delete` or `find . -maxdepth 1 -name '*.jpg' -exec mv -t /dest {} +`. For other commands pipe through xargs: `printf '%s\\0' *.log | xargs -0 rm`."
keywords: linux bash argument list too long rm mv cp ls glob e2big arg_max find -delete xargs -0 exec + errno 7
related: [linux-too-many-open-files, linux-no-space-left-on-device, linux-command-not-found]
---
## What it means

The shell expands `*.log` into one argument per file *before* running `rm`. When the total size of the arguments plus environment variables exceeds the kernel limit, `execve()` fails with `E2BIG`, shown as "Argument list too long". The command never runs.

Check the limit (bytes):

```bash
getconf ARG_MAX          # typically 2097152 (2 MiB) on Linux
```

There's also a per-argument limit of 128 KiB (`MAX_ARG_STRLEN`), which matters for one huge argument (e.g. a giant `-e` string or environment variable).

Shell builtins like `echo` and `printf` aren't affected because no `execve` happens — that's why the tricks below work.

## Fix 1: find (best for delete/move/copy)

```bash
# delete
find . -maxdepth 1 -type f -name '*.log' -delete

# move (GNU mv supports -t target-directory)
find . -maxdepth 1 -type f -name '*.jpg' -exec mv -t /dest/ {} +

# copy
find src/ -maxdepth 1 -type f -name '*.csv' -exec cp -t backup/ {} +
```

`-exec ... {} +` packs as many filenames per invocation as fit under the limit, so it's fast. Drop `-maxdepth 1` to include subdirectories. Run without `-delete` first to preview what matches.

## Fix 2: xargs with null separators

```bash
printf '%s\0' *.log | xargs -0 rm --
```

`printf` is a builtin, so the expansion is fine; `xargs` splits the list into chunks below ARG_MAX. `-0` makes filenames with spaces and newlines safe. Add `-P 4` to run in parallel for slow commands.

With find:

```bash
find . -name '*.tmp' -print0 | xargs -0 rm -f --
```

## Fix 3: a loop (simple, slower)

```bash
for f in *.log; do rm -- "$f"; done
```

One process per file; fine for thousands, slow for millions.

## Fix 4: operate on the directory

If you want to empty a directory completely, removing and recreating it avoids expanding anything:

```bash
rm -rf /var/app/cache && mkdir /var/app/cache
```

(Preserve ownership/permissions if needed.) `rsync -a --delete empty/ target/` is another fast way to empty a huge directory.

## ls and wc

```bash
ls | wc -l                          # count files without a glob
find . -maxdepth 1 -name '*.log' | wc -l
```

## tar, grep, and others

```bash
find . -name '*.json' -print0 | tar --null -czf data.tgz -T -
grep -r "needle" --include='*.log' .       # let grep recurse instead of grep needle *.log
```

## In scripts and programs

Python's `subprocess.run(["rm"] + files)` fails the same way (`OSError: [Errno 7]`). Batch the list, or call `os.remove()` in a loop instead of spawning a process. In Makefiles and build tools, extremely long command lines (many object files) can hit it too; use response files (`@args.txt`) where the tool supports them.

## Raising the limit

On Linux, ARG_MAX is a quarter of the stack size limit, so `ulimit -s unlimited` or a larger `ulimit -s` raises it for that shell. It's rarely the right fix; find and xargs scale to any number of files.
