---
error: "The operation couldn't be completed. Unable to locate a Java Runtime."
error_full: |
  The operation couldn't be completed. Unable to locate a Java Runtime.
  Please visit http://www.java.com for information on installing Java.
cat: java
description: "On macOS, `/usr/bin/java` is only a stub that looks for a JDK in /Library/Java/JavaVirtualMachines. This message means none is registered there, e.g. Java is not installed or was installed by Homebrew without the symlink."
tldr: "Install a JDK: `brew install openjdk@21` and then link it for the system wrapper: `sudo ln -sfn $(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk`. Or install a .pkg (Temurin, Oracle, Zulu). Verify with `/usr/libexec/java_home -V` and `java -version`, then set `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`."
keywords: macos unable to locate a java runtime the operation couldn't be completed java -version homebrew openjdk symlink JavaVirtualMachines java_home temurin sdkman jenv mac m1 apple silicon
related: [java-home-is-not-set, java-unsupportedclassversionerror, java-could-not-find-or-load-main-class]
---
## What it means

macOS ships `/usr/bin/java`, `javac`, `jar` etc. as wrappers. They ask `/usr/libexec/java_home` for an installed JDK, which only searches `/Library/Java/JavaVirtualMachines/` (and `~/Library/Java/JavaVirtualMachines/`). If nothing is there, you get this message, even if a JDK exists elsewhere on disk.

Check what's registered:

```bash
/usr/libexec/java_home -V
which -a java
```

## Fix 1: install a JDK package

The simplest route is an installer that registers itself, e.g. Eclipse Temurin (adoptium.net), Oracle JDK or Azul Zulu. Pick the `.pkg` for your CPU (aarch64 for Apple Silicon M1–M4, x64 for Intel). Or with Homebrew casks:

```bash
brew install --cask temurin@21
java -version
```

## Fix 2: Homebrew `openjdk` formula needs a symlink

`brew install openjdk` installs into Homebrew's prefix and is *keg-only*: the system wrapper can't see it. Brew prints the fix in its caveats; for version 21:

```bash
brew install openjdk@21
sudo ln -sfn "$(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk" \
  /Library/Java/JavaVirtualMachines/openjdk-21.jdk
java -version
```

(`brew --prefix` is `/opt/homebrew` on Apple Silicon, `/usr/local` on Intel.) Alternatively skip the wrapper and put brew's java first on your PATH in `~/.zshrc`:

```bash
export PATH="$(brew --prefix)/opt/openjdk@21/bin:$PATH"
```

## Fix 3: set JAVA_HOME

Build tools (Gradle, Maven, Android Studio command line, Flutter) use `JAVA_HOME`. In `~/.zshrc`:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

Open a new terminal and check `echo $JAVA_HOME`. See also [JAVA_HOME is not set](/java/java-home-is-not-set/).

## Fix 4: version managers (SDKMAN, jenv, asdf)

SDKMAN installs JDKs under `~/.sdkman/candidates/java` and puts them on PATH, so it works without the wrapper, but only in shells where SDKMAN is initialized. If you see this error from a GUI app, an IDE or `/usr/bin/java` explicitly, those don't use your shell PATH; set the JDK in the IDE settings or use Fix 1/2.

```bash
curl -s "https://get.sdkman.io" | bash
sdk install java 21.0.5-tem
```

## Fix 5: specific apps

- **Android Studio / Flutter**: use the bundled JBR: `flutter config --jdk-dir "/Applications/Android Studio.app/Contents/jbr/Contents/Home"`, or `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`.
- **VS Code Java**: set `java.jdt.ls.java.home` or `java.configuration.runtimes`.
- **Scripts run from cron/launchd**: they don't read `~/.zshrc`; use absolute paths or set `JAVA_HOME` in the script.

## Wrong architecture

On Apple Silicon, an x64 JDK runs through Rosetta, and an arm64 JDK on Intel won't load at all. `file "$(/usr/libexec/java_home)/bin/java"` shows the architecture; install the matching build.
