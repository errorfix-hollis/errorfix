---
error: "Unsupported class file major version 65"
error_full: |
  BUG! exception in phase 'semantic analysis' in source unit '_BuildScript_' Unsupported class file major version 65
  java.lang.IllegalArgumentException: Unsupported class file major version 61
cat: java
description: "A tool that reads .class files (Gradle's Groovy, ASM, an old Spring, Jacoco, Lombok, Spotbugs, Android Gradle Plugin) is older than the JDK that compiled those classes or that runs the build. Usually: Gradle is too old for your JDK."
tldr: "Map the number to a Java version (52=8, 55=11, 61=17, 65=21, 69=25). Either run the build with an older JDK (`export JAVA_HOME=/path/to/jdk-17`, or set Gradle JDK in IntelliJ) or upgrade the tool: `./gradlew wrapper --gradle-version 8.10` (Java 21 needs Gradle 8.5+, Java 17 needs 7.3+). Upgrade ASM-based plugins too."
keywords: unsupported class file major version 61 65 66 69 gradle java 17 21 bug exception in phase semantic analysis groovy asm illegalargumentexception intellij gradle jvm android
related: [java-unsupportedclassversionerror, java-error-release-version-not-supported, java-home-is-not-set]
---
## What it means

Every `.class` file starts with a *major version* that says which Java release produced it. Tools that parse bytecode (rather than the JVM running it) refuse versions newer than they know about.

| Major | Java |
|---|---|
| 52 | 8 |
| 55 | 11 |
| 61 | 17 |
| 65 | 21 |
| 66 | 22 |
| 67 | 23 |
| 68 | 24 |
| 69 | 25 |

So `major version 65` = something was compiled for/by Java 21, and the tool reading it predates Java 21 support.

This differs from `UnsupportedClassVersionError` (the JVM itself is too old to *run* the class); see [UnsupportedClassVersionError](/java/java-unsupportedclassversionerror/).

## Cause 1: Gradle is older than your JDK (most common)

`BUG! exception in phase 'semantic analysis' in source unit '_BuildScript_'` is Gradle's embedded Groovy failing because the JDK running Gradle is too new. Minimum Gradle per JDK:

| JDK | Gradle |
|---|---|
| 17 | 7.3 |
| 21 | 8.5 |
| 23 | 8.10 |
| 25 | 9.1 |

Check and upgrade the wrapper:

```bash
./gradlew --version          # shows Gradle version and the JVM it runs on
./gradlew wrapper --gradle-version 8.10
./gradlew --version          # run twice to make sure the new version is used
```

If the old Gradle can't even start on your JDK, edit `gradle/wrapper/gradle-wrapper.properties` directly:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.10-bin.zip
```

## Cause 2: the build runs on a newer JDK than you think

Your project may target 17, but Gradle runs on whatever `JAVA_HOME` points to (or the IDE's setting).

- **Shell**: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` (macOS) or `export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64` (Linux).
- **IntelliJ**: *Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JVM*, pick 17 (or upgrade Gradle as above).
- **Android Studio**: *Settings > Build Tools > Gradle > Gradle JDK*. Newer Android Studio bundles JDK 21, which needs AGP 8.2.1+ / Gradle 8.5+.

To compile for a specific version independently of the JDK running Gradle, use a toolchain:

```groovy
java {
    toolchain { languageVersion = JavaLanguageVersion.of(17) }
}
```

## Cause 3: an old library or plugin with an old ASM

At runtime or during tests (Spring, Jacoco, Mockito/ByteBuddy, Spotbugs, Lombok, Shadow plugin), the stack trace shows `org.objectweb.asm.ClassReader`. Upgrade that component:

- Spring Framework 5.3.x supports Java 17; Java 21 needs Spring Framework 6.1 / Spring Boot 3.2+ for full support.
- Jacoco: 0.8.11+ for Java 21; use the latest release for newer JDKs.
- Lombok: 1.18.30+ for Java 21.
- Mockito/ByteBuddy: update to the latest version for new JDKs.

## Cause 4: Maven

Maven itself doesn't hit this often, but plugins do (`maven-shade-plugin`, `maven-surefire-plugin` with old Jacoco). Update plugin versions and check `mvn -v` for the JDK Maven uses.

Quick check of a class file's version:

```bash
javap -v MyClass.class | grep major
```
