---
error: "Execution failed for task ':compileJava'."
error_full: |
  FAILURE: Build failed with an exception.

  * What went wrong:
  Execution failed for task ':compileJava'.
  > Compilation failed; see the compiler error output for details.
cat: java
description: "Gradle's Java compile step failed. The line itself is generic; the real cause is printed above it (a javac error) or below it (a toolchain/JDK problem like invalid source release)."
tldr: "Scroll up for the first `error:` line from javac, or rerun `./gradlew compileJava --stacktrace`. Common causes: code errors (`cannot find symbol`), a JDK older than the `sourceCompatibility`/toolchain (`invalid source release: 21`), or a Gradle JDK too new for the Gradle version. Set `java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }` and make sure `JAVA_HOME` / the IDE's Gradle JVM match."
keywords: gradle execution failed for task compileJava compilation failed see the compiler error output invalid source release error release version not supported toolchain sourceCompatibility JAVA_HOME android studio intellij lombok
related: [java-error-release-version-not-supported, java-error-cannot-find-symbol, java-unsupported-class-file-major-version]
---
## What it means

`:compileJava` runs javac on `src/main/java`. When it fails, Gradle prints this summary, but the useful message is elsewhere. Get it with:

```bash
./gradlew compileJava --console=plain
./gradlew compileJava --stacktrace     # for toolchain/plugin errors
```

Look for the **first** line starting with `error:` or `> ` under *What went wrong*.

## Cause 1: ordinary compile errors

Output like:

```
src/main/java/com/acme/App.java:12: error: cannot find symbol
    Foo foo = new Foo();
    ^
```

This is a code problem: fix the reported line. Typical ones: missing import, typo, missing dependency in `build.gradle` (`implementation 'group:artifact:version'`), or `incompatible types`. Fix the first error first; later ones are often follow-ups.

## Cause 2: `invalid source release` / `release version X not supported`

```
> error: invalid source release: 21
> error: release version 17 not supported
```

The JDK running Gradle is older than the Java version your build targets. Either install the newer JDK or let Gradle use a toolchain:

```groovy
// build.gradle
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```

Kotlin DSL (`build.gradle.kts`) is the same with `languageVersion.set(JavaLanguageVersion.of(17))` on older Gradle. Add the foojay plugin in `settings.gradle` so Gradle can download missing JDKs:

```groovy
plugins { id 'org.gradle.toolchains.foojay-resolver-convention' version '0.8.0' }
```

Check which JDK Gradle uses: `./gradlew -version` (look at *Launcher JVM* / *Daemon JVM*).

## Cause 3: JDK too new for your Gradle

`Unsupported class file major version 65` or a compile failure right after upgrading the JDK means Gradle itself doesn't support that Java version. Upgrade the wrapper:

```bash
./gradlew wrapper --gradle-version 8.10
```

(Gradle 8.5+ for Java 21; 8.8+ for Java 22.) Or point Gradle to an older JDK.

## Cause 4: IDE uses a different JDK

IntelliJ: *Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JVM*. Android Studio: *Settings → Build Tools → Gradle → Gradle JDK* (use the bundled JBR 17+). Make it match `JAVA_HOME`:

```bash
java -version
echo $JAVA_HOME
```

## Cause 5: annotation processors (Lombok, MapStruct)

`cannot find symbol` for getters/builders means the processor isn't running. Declare it for compile **and** annotation processing:

```groovy
dependencies {
    compileOnly 'org.projectlombok:lombok:1.18.34'
    annotationProcessor 'org.projectlombok:lombok:1.18.34'
}
```

Old Lombok versions also fail on new JDKs with `IllegalAccessError ... com.sun.tools.javac`; upgrade Lombok.

## Cause 6: encoding errors

`unmappable character for encoding` on Windows: set UTF-8:

```groovy
tasks.withType(JavaCompile).configureEach { options.encoding = 'UTF-8' }
```

## Still stuck

Clear stale outputs: `./gradlew clean build --no-build-cache`, and stop old daemons with `./gradlew --stop`.
