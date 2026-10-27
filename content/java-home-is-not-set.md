---
error: "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH."
cat: java
description: Gradle, Maven or another tool can't find a Java installation. Install a JDK and set JAVA_HOME to its folder.
tldr: "Install a JDK, then set `JAVA_HOME` to its root folder (the one containing `bin/java`), e.g. `export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64` in `~/.bashrc`, and add `$JAVA_HOME/bin` to PATH."
keywords: java_home is not set no java command could be found in your path gradle maven android studio flutter jdk windows mac
related: [java-unsupportedclassversionerror]
---
## What it means

The tool's launcher script looks at the `JAVA_HOME` environment variable, then for `java` on your PATH. It found neither.

## Step 1: install a JDK (if you haven't)

```bash
# Ubuntu / Debian
sudo apt install openjdk-21-jdk
# Fedora
sudo dnf install java-21-openjdk-devel
# macOS
brew install openjdk@21
```

Windows: install Eclipse Temurin or Microsoft OpenJDK; tick "Set JAVA_HOME" in the installer.

## Step 2: find the JDK folder

```bash
# Linux
dirname "$(dirname "$(readlink -f "$(which java)")")"
ls /usr/lib/jvm/
# macOS
/usr/libexec/java_home -V
```

## Step 3: set JAVA_HOME

**Linux** (`~/.bashrc` or `~/.zshrc`):

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
```

**macOS** (`~/.zshrc`):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

**Windows (PowerShell, persistent):**

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.4.7-hotspot"
```

Then add `%JAVA_HOME%\bin` to *Path* in System Properties → Environment Variables, and open a **new** terminal.

`JAVA_HOME` must point to the JDK **root**, not its `bin` folder.

## Android / Flutter

Android Studio bundles a JDK. Point to it, e.g. `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"` on macOS, or `C:\Program Files\Android\Android Studio\jbr` on Windows. Flutter can be told directly: `flutter config --jdk-dir <path>`.

## Check

```bash
echo $JAVA_HOME
"$JAVA_HOME/bin/java" -version
```
