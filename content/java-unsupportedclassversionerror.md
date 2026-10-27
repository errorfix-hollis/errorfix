---
error: "java.lang.UnsupportedClassVersionError: has been compiled by a more recent version of the Java Runtime"
error_full: |
  Error: LinkageError occurred while loading main class com.example.App
          java.lang.UnsupportedClassVersionError: com/example/App has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 55.0
cat: java
description: The code was compiled for a newer Java than the one running it. Run it with a newer JDK, or compile for the older version with --release.
tldr: "Check `java -version`. Install/switch to the Java version that matches the class file version (65 = Java 21, 61 = Java 17, 55 = Java 11), or rebuild with `--release 11` (Maven: `<maven.compiler.release>11</maven.compiler.release>`)."
keywords: unsupportedclassversionerror class file version 65.0 61.0 55.0 52.0 compiled by a more recent version java runtime jdk maven gradle
related: [java-home-is-not-set]
---
## What it means

Every `.class` file records which Java version it targets. The JVM you're running is **older** than that and refuses to load it.

## Class file version → Java version

| Class file version | Java |
|---|---|
| 52.0 | 8 |
| 55.0 | 11 |
| 61.0 | 17 |
| 65.0 | 21 |
| 69.0 | 25 |

In the example, the class needs Java 21 (65.0) but the runtime is Java 11 (55.0).

## Fix 1: run it with a newer Java

```bash
java -version
```

Ubuntu/Debian: `sudo apt install openjdk-21-jre` and choose it with `sudo update-alternatives --config java`. macOS: `brew install openjdk@21`. SDKMAN works everywhere: `sdk install java 21-tem`.

Make sure `JAVA_HOME` and your IDE point to the same JDK. Multiple installed versions are the usual reason "but I installed Java 21!" still fails.

## Fix 2: compile for the older Java

**javac:**

```bash
javac --release 11 App.java
```

**Maven:**

```xml
<properties>
  <maven.compiler.release>11</maven.compiler.release>
</properties>
```

**Gradle:**

```groovy
java { toolchain { languageVersion = JavaLanguageVersion.of(11) } }
```

`--release` also stops you from using APIs that don't exist in the older version, unlike the old `-source`/`-target` flags.

## It's a library, not your code

If the class belongs to a dependency (e.g. `org/springframework/...`), that library version requires a newer Java. Spring Boot 3 needs Java 17+, for example. Either upgrade Java or use an older library version.

## In IntelliJ / Eclipse

Set the project SDK and the run configuration's JRE to the same version: IntelliJ *File → Project Structure → Project SDK* and *Run → Edit Configurations → JRE*.
