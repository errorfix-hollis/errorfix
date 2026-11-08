---
error: "error: release version 17 not supported"
error_full: |
  [ERROR] Failed to execute goal org.apache.maven.plugins:maven-compiler-plugin:3.11.0:compile (default-compile) on project app: Fatal error compiling: error: release version 17 not supported
  error: invalid target release: 17
  error: invalid source release: 21
cat: java
description: "The javac doing the compile is older than the Java version the project targets (e.g. JDK 11 compiling with --release 17). Maven, Gradle or the IDE is using a different JDK than you think."
tldr: "Check which JDK the build really uses: `mvn -v` (look at 'Java version') or `./gradlew -version`. Point `JAVA_HOME` at a JDK >= the target (e.g. `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` on macOS, `sudo update-alternatives --config java` on Linux), or lower `maven.compiler.release` to match. In IntelliJ set Project SDK and Maven/Gradle JVM."
keywords: java error release version 17 not supported invalid target release invalid source release maven compiler plugin gradle java_home jdk version intellij project sdk 21 11 8
related: [java-unsupportedclassversionerror, java-home-is-not-set, java-unable-to-locate-a-java-runtime]
---
## What it means

`javac --release N` (or `-source`/`-target N`) can only produce code for Java versions up to its own version. A JDK 11 compiler doesn't know Java 17, so it fails with `release version 17 not supported` (with `--release`) or `invalid target release: 17` (with `-target`).

The project's configured version is usually correct; the problem is **which JDK runs the build**. Note that `java -version` on your PATH may differ from what Maven, Gradle or the IDE uses.

This is the compile-time sibling of [UnsupportedClassVersionError](/java/java-unsupportedclassversionerror/), which happens at runtime when a JRE is too old for compiled classes.

## Step 1: find the JDK the build uses

```bash
mvn -v                  # "Java version: 11.0.21, vendor..., runtime: /usr/lib/jvm/..."
./gradlew -version      # "Launcher JVM" / "Daemon JVM"
echo $JAVA_HOME
javac -version
```

## Fix 1: point JAVA_HOME at a newer JDK

Install a JDK at least as new as the target (Temurin, Zulu, Oracle, distro `openjdk-17-jdk`), then:

**Linux**

```bash
sudo apt install openjdk-17-jdk
sudo update-alternatives --config java
sudo update-alternatives --config javac
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

**macOS**

```bash
/usr/libexec/java_home -V                       # list installed JDKs
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

**Windows**: set the `JAVA_HOME` environment variable to e.g. `C:\Program Files\Eclipse Adoptium\jdk-17...` and put `%JAVA_HOME%\bin` first in `Path`, then open a new terminal.

Add the export to `~/.bashrc`/`~/.zshrc` to keep it. SDKMAN (`sdk use java 17.0.9-tem`) also works well for switching.

## Fix 2: lower the target instead

If you must build with the older JDK and don't use newer language features, set the target to match it.

Maven:

```xml
<properties>
  <maven.compiler.release>11</maven.compiler.release>
</properties>
```

Gradle (Kotlin DSL):

```kotlin
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}
```

The Gradle toolchain approach is usually better than lowering the version: Gradle finds (or, with the foojay resolver plugin, downloads) a JDK 17 regardless of the JDK it runs on.

## Fix 3: IDE settings

IntelliJ IDEA uses several separate JDK settings:

- **File → Project Structure → Project → SDK** and language level.
- **Settings → Build, Execution, Deployment → Build Tools → Maven → Runner → JRE**.
- **Settings → Build Tools → Gradle → Gradle JVM**.
- **Settings → Java Compiler → Per-module bytecode version**.

In VS Code, set `java.configuration.runtimes` or `java.jdt.ls.java.home`. In Eclipse, **Window → Preferences → Java → Installed JREs** and the project's compiler compliance level.

## Fix 4: CI and Docker

In GitHub Actions, match `java-version` to the target:

```yaml
- uses: actions/setup-java@v4
  with:
    distribution: temurin
    java-version: '17'
```

In Docker, use a build image with the right JDK, e.g. `FROM maven:3.9-eclipse-temurin-17` rather than an image based on JDK 11.

## Old Maven compiler plugin

Very old `maven-compiler-plugin` versions (before 3.6) don't support `<release>`. Upgrade to a current 3.x version.
