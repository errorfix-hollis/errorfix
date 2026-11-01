---
error: "ImportError: libGL.so.1: cannot open shared object file: No such file or directory"
error_full: |
  Traceback (most recent call last):
    File "app.py", line 1, in <module>
      import cv2
  ImportError: libGL.so.1: cannot open shared object file: No such file or directory
cat: python
description: OpenCV (cv2) or another GUI-capable library needs the system OpenGL library, which minimal Linux images and Docker containers don't include. Install the system package, or use the headless OpenCV wheel.
tldr: "On servers and in Docker, switch to the headless build: `pip uninstall -y opencv-python && pip install opencv-python-headless`. Or install the library: `sudo apt-get install -y libgl1` (Debian/Ubuntu; older releases: `libgl1-mesa-glx`). If it then complains about `libgthread-2.0.so.0`, also install `libglib2.0-0`."
keywords: importerror libgl.so.1 cannot open shared object file no such file or directory cv2 opencv docker libgl1 libgl1-mesa-glx opencv-python-headless libglib2.0-0 libgthread
related: [python-modulenotfounderror-no-module-named, python-failed-building-wheel, docker-failed-to-solve-did-not-complete-successfully]
---
## What it means

`import cv2` loads OpenCV's compiled extension, which is linked against system shared libraries. The regular `opencv-python` wheel includes GUI support (`cv2.imshow`), so it links to `libGL.so.1` (OpenGL) and GLib. The Python package doesn't ship those; the dynamic linker looks for them on the system and can't find them. Common in `python:*-slim` Docker images, WSL, CI runners and cloud servers.

## Fix 1: use the headless OpenCV package (best for servers)

If you don't open windows (`cv2.imshow`, `cv2.waitKey`), you don't need OpenGL at all:

```bash
pip uninstall -y opencv-python opencv-contrib-python
pip install opencv-python-headless
# or, if you need the contrib modules
pip install opencv-contrib-python-headless
```

Only install **one** of the four OpenCV packages; they all provide `cv2` and overwrite each other. Check with `pip list | grep -i opencv`.

Watch out for dependencies that pull in the non-headless `opencv-python` again (some versions of `ultralytics`, `albumentations`, `easyocr` do). Uninstall it after installing them, or install the headless package last.

## Fix 2: install the system library

Debian 12 / Ubuntu 22.04 and newer:

```bash
sudo apt-get update
sudo apt-get install -y libgl1
```

Older Debian/Ubuntu (Ubuntu 20.04, Debian 11):

```bash
sudo apt-get install -y libgl1-mesa-glx
```

On new releases `libgl1-mesa-glx` no longer exists (`E: Package 'libgl1-mesa-glx' has no installation candidate`); use `libgl1`.

Fedora/RHEL: `sudo dnf install mesa-libGL`. Alpine: `apk add mesa-gl`.

## Fix 3: the next error, libgthread-2.0.so.0

After fixing libGL you may get:

```
ImportError: libgthread-2.0.so.0: cannot open shared object file: No such file or directory
```

That's GLib:

```bash
sudo apt-get install -y libglib2.0-0
```

(On Ubuntu 24.04 the package is named `libglib2.0-0t64`; `apt-get install libglib2.0-0` still resolves to it.)

## Dockerfile

```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```

Or skip the system packages and put `opencv-python-headless` in `requirements.txt`.

## Find which library is missing

For any `cannot open shared object file` error, list the unresolved dependencies of the extension module:

```bash
find "$(python -c 'import sysconfig; print(sysconfig.get_paths()["platlib"])')/cv2" -name "*.so" \
  -exec ldd {} \; | grep "not found"
```

Then search for the package that provides it: `apt-file search libGL.so.1` (after `sudo apt install apt-file && sudo apt-file update`).
