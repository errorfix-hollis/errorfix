---
error: "TypeError: expected str, bytes or os.PathLike object, not NoneType"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 5, in <module>
      with open(config_path) as f:
  TypeError: expected str, bytes or os.PathLike object, not NoneType
cat: python
description: "A function that needs a file path (`open`, `os.path.join`, `Path`, `os.listdir`, `subprocess`) got `None`. Usually the path came from an unset environment variable, a missing argument, or a function that returned nothing."
tldr: "Find which argument is `None` and why. Most often `os.getenv(\"X\")` / `os.environ.get(\"X\")` returned `None` because the variable isn't set: export it, load your `.env` with `load_dotenv()` before reading it, or give a default `os.getenv(\"X\", \"default.json\")`. Fail early with a clear message: `if path is None: raise SystemExit(\"X is not set\")`."
keywords: typeerror expected str bytes or os.pathlike object not nonetype open os.path.join os.getenv none environment variable not set argparse path none pathlib subprocess list tuple int
related: [python-modulenotfounderror-no-module-named-dotenv, python-filenotfounderror-no-such-file-or-directory, python-attributeerror-nonetype-object-has-no-attribute]
---
## What it means

File-system functions accept a `str`, `bytes` or an object with `__fspath__` (like `pathlib.Path`). Passing `None` raises this error. The last line of the traceback shows which call; then trace back where its argument was set.

Variants with other types: `not int` (passed a file descriptor or number by mistake), `not list` (passed a list of paths instead of one), `not dict`, `not TextIOWrapper` (passed an open file object instead of its name).

## Cause 1: environment variable not set

```python
import os
path = os.getenv("CONFIG_PATH")      # None if not set
open(path)                           # TypeError
```

Check and set it:

```bash
echo "$CONFIG_PATH"
export CONFIG_PATH=/etc/myapp/config.json
python app.py
```

Use a default or fail loudly:

```python
path = os.getenv("CONFIG_PATH", "config.json")
# or
path = os.environ["CONFIG_PATH"]    # KeyError naming the variable — clearer
```

Environment variables set in your shell profile are not seen by cron, systemd services, IDE run configurations or Docker containers unless passed explicitly (`Environment=` in the unit, `-e VAR=...` / `env_file:` for Docker).

## Cause 2: .env file not loaded (or loaded too late)

```python
from dotenv import load_dotenv
import os

load_dotenv()                         # must run before getenv
DB_FILE = os.getenv("DB_FILE")
```

If the module that reads the variable is imported before `load_dotenv()` runs, it captures `None`. Call `load_dotenv()` at the very top of your entry point. `load_dotenv()` searches from the calling file's directory upward; pass an explicit path if needed: `load_dotenv("/app/.env")`.

## Cause 3: a function that doesn't return the path

```python
def get_output_path(name):
    path = os.path.join("out", name)
    # forgot: return path

open(get_output_path("a.txt"), "w")   # open(None)
```

Any function without `return` returns `None`. Same for branches that fall through:

```python
def pick_file(kind):
    if kind == "csv":
        return "data.csv"
    # kind == "json" -> None
```

## Cause 4: optional argparse / CLI arguments

```python
parser.add_argument("--input")
args = parser.parse_args()
open(args.input)        # None when --input wasn't passed
```

Make it required or give a default:

```python
parser.add_argument("--input", required=True)
# or
parser.add_argument("--input", default="input.txt")
```

## Cause 5: library settings and dialogs

- Django: `os.path.join(BASE_DIR, ...)` where a custom setting is `None`, or `STATIC_ROOT = None` with `collectstatic`.
- Tkinter: `filedialog.askopenfilename()` returns `''` on cancel, but some wrappers return `None`. Check before opening.
- `shutil.which("tool")` returns `None` if the program isn't on PATH; passing that to `subprocess.run([...])` gives this error. Check it first:

```python
import shutil
exe = shutil.which("ffmpeg")
if exe is None:
    raise SystemExit("ffmpeg not found on PATH")
```

## Debugging tip

Print the value and its type right before the failing line:

```python
print(repr(path), type(path))
```
