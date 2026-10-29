---
error: "FileNotFoundError: [Errno 2] No such file or directory"
error_full: |
  Traceback (most recent call last):
    File "/home/me/project/src/app.py", line 1, in <module>
      with open("data.csv") as f:
  FileNotFoundError: [Errno 2] No such file or directory: 'data.csv'
cat: python
description: Python couldn't find the file at that path. Relative paths are resolved from the current working directory, not from the script's folder, which is the cause most of the time.
tldr: "Build paths relative to the script: `from pathlib import Path; path = Path(__file__).parent / \"data.csv\"`. Print `os.getcwd()` to see where Python is looking. On Windows, use raw strings `r\"C:\\path\"` or forward slashes."
keywords: python filenotfounderror errno 2 no such file or directory relative path working directory __file__ pathlib vscode windows backslash
related: [python-modulenotfounderror-no-module-named, python-unicodedecodeerror-utf-8]
---
## What it means

`open("data.csv")` looks for `data.csv` in the **current working directory** — the folder you ran `python` from, or the folder your IDE uses — not the folder that contains your script.

Check:

```python
import os
print(os.getcwd())
print(os.listdir())
```

## Fix 1: make paths relative to the script

```python
from pathlib import Path

HERE = Path(__file__).resolve().parent
with open(HERE / "data.csv") as f:
    ...
```

Now it works no matter where you run it from. For a file one level up: `HERE.parent / "data" / "data.csv"`.

## Fix 2: run from the right folder / configure your IDE

- VS Code runs files with the workspace root as working directory. Set `"python.terminal.executeInFileDir": true` or adjust `cwd` in `launch.json`.
- PyCharm: Run configuration → *Working directory*.
- Jupyter uses the notebook's folder.
- cron/systemd jobs start in `/` or your home folder; always use absolute paths there.

## Fix 3: Windows paths

Backslashes are escape characters in normal strings: `"C:\new\data.csv"` contains a newline (`\n`).

```python
open(r"C:\new\data.csv")       # raw string
open("C:/new/data.csv")        # forward slashes work too
```

Also check for hidden extensions: Explorer may show `data.csv` while the file is really `data.csv.txt`.

## Fix 4: the directory doesn't exist when writing

`open("out/result.txt", "w")` fails if `out/` doesn't exist. Create it first:

```python
Path("out").mkdir(parents=True, exist_ok=True)
```

## Fix 5: it's a program, not a file

`FileNotFoundError` from `subprocess.run(["node", ...])` means the **executable** wasn't found on PATH. Use the full path, or `shutil.which("node")` to check.

## Docker

Inside a container, the file must be copied in (`COPY data.csv /app/`) or mounted with `-v`. Paths from your host don't exist in the container.
