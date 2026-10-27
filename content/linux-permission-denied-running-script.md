---
error: "bash: ./script.sh: Permission denied"
cat: linux
description: The file isn't marked as executable, or it lives on a filesystem mounted with noexec. Add the execute bit or run it through the interpreter.
tldr: "Run `chmod +x script.sh` and try `./script.sh` again. Or run it without the execute bit: `bash script.sh`."
keywords: permission denied running script chmod +x execute noexec bash ./ linux sh
related: [linux-bad-interpreter-no-such-file]
---
## What it means

To run `./script.sh` directly, the file needs the **execute** permission for your user. It doesn't have it.

## Fix

```bash
chmod +x script.sh
./script.sh
```

Or skip the permission check by passing the file to the interpreter:

```bash
bash script.sh
python3 script.py
```

## Check the permissions

```bash
ls -l script.sh
# -rw-r--r--  → not executable
# -rwxr-xr-x  → executable
```

## Still "Permission denied" after chmod +x

**The filesystem is mounted noexec.** Common for `/tmp`, USB drives, and some shared folders:

```bash
findmnt -T script.sh -o TARGET,OPTIONS
```

If you see `noexec`, move the script elsewhere (e.g. your home folder) or run it with `bash script.sh`.

**The file belongs to someone else** and only they have execute rights. Check the owner in `ls -l`, and fix with `sudo chown "$USER" script.sh` if appropriate.

**A folder in the path isn't searchable** (missing `x` on a directory). Check with `namei -l /path/to/script.sh`.

**In Git**, the execute bit is tracked. Commit it so others get it too:

```bash
git update-index --chmod=+x script.sh
git commit -m "Make script executable"
```

## "Permission denied" for other commands

If the message comes from inside the script (e.g. writing a file in `/etc`), the script needs higher privileges for that step: run it with `sudo`, or change the target path.
