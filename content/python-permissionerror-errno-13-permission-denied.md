---
error: "PermissionError: [Errno 13] Permission denied"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 3, in <module>
      with open("/var/log/app.log", "w") as f:
  PermissionError: [Errno 13] Permission denied: '/var/log/app.log'
cat: python
description: "Python asked the OS to open, write, delete or execute a path and the OS refused. Either your user lacks permission, the path is a directory, or (on Windows) another program has the file locked."
tldr: "Check what the path is and who owns it: `ls -ld /path/to/file`. If it's a directory, open a file inside it instead. Write to a location you own (e.g. your home or project dir), fix ownership with `sudo chown $USER /path`, or close the program (Excel, an editor) that holds the file open on Windows. Don't run pip with sudo; use a venv."
keywords: python permissionerror errno 13 permission denied open file write directory windows file locked excel pip install sudo chmod chown
related: [python-filenotfounderror-no-such-file-or-directory, linux-permission-denied-running-script, python-externally-managed-environment]
---
## What it means

`Errno 13` is `EACCES` from the operating system. Python only reports it; the fix is about the path, the user running the script, or another process. The path in the message tells you exactly which file was refused.

```bash
ls -ld /var/log/app.log /var/log   # owner, group, mode of the file and its folder
id                                 # which user/groups you are
```

To create or delete a file you need write permission on the **folder**; to modify an existing file you need write permission on the **file**. Use the [chmod calculator](/tools/chmod-calculator/) to decode modes like `drwxr-xr-x`.

## Cause 1: the path is a directory

The most common case on Windows: `open("C:\\data")` or `open(folder)` where `folder` is a directory gives `Permission denied` (on Linux it's `IsADirectoryError`). Build the full file path:

```python
from pathlib import Path

out = Path("C:/data") / "result.csv"
with open(out, "w") as f:
    f.write("...")
```

Same with `shutil.copy(src, dst_dir)`: fine on most systems, but `shutil.copyfile` requires a file path for `dst`.

## Cause 2: you don't own the location

Writing to `/var/log`, `/etc`, `/usr`, `C:\Program Files` or the filesystem root needs admin rights. Write somewhere you own instead:

```python
from pathlib import Path
log = Path.home() / ".myapp" / "app.log"
log.parent.mkdir(parents=True, exist_ok=True)
```

If the file really belongs in a system location, give your user ownership once:

```bash
sudo mkdir -p /var/log/myapp
sudo chown "$USER": /var/log/myapp
```

Files previously created by `sudo python ...` are owned by root; fix with `sudo chown -R "$USER": path`.

## Cause 3: the file is locked by another program (Windows)

Windows refuses to open or delete a file that another process has open, e.g. a CSV/XLSX open in Excel, or a file still open in your own script. Close it in the other program, and close your own handles with `with` blocks before calling `os.remove()` or `os.rename()`.

Antivirus and OneDrive sync can briefly lock files too; moving the project out of a OneDrive folder often helps.

## Cause 4: pip install into system Python

`ERROR: Could not install packages due to an OSError: [Errno 13] Permission denied: '/usr/lib/python3/dist-packages/...'` means pip tried to write into a system folder. Don't use `sudo pip`; use a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install requests
```

Or `pip install --user package` for a per-user install.

## Cause 5: executing a file without the execute bit

`subprocess.run(["./script.sh"])` raises `PermissionError` if the script isn't executable:

```bash
chmod +x script.sh
```

Or call it through the interpreter: `subprocess.run(["bash", "script.sh"])`.

## Cause 6: Docker volumes

Inside a container running as a non-root user, a bind-mounted host folder owned by another UID is read-only to you. Match the UID (`docker run --user "$(id -u):$(id -g)" ...`) or `chown` the host folder to the container's UID.
