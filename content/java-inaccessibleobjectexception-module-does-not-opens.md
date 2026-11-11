---
error: "java.lang.reflect.InaccessibleObjectException: Unable to make field accessible: module java.base does not \"opens java.lang\" to unnamed module"
error_full: |
  java.lang.reflect.InaccessibleObjectException: Unable to make field private final byte[] java.lang.String.value accessible: module java.base does not "opens java.lang" to unnamed module @6d06d69c
      at java.base/java.lang.reflect.AccessibleObject.checkCanSetAccessible(AccessibleObject.java:354)
      at java.base/java.lang.reflect.Field.setAccessible(Field.java:172)
cat: java
description: "Since Java 16 (JEP 396) and Java 17 (JEP 403), the JDK's internal packages are strongly encapsulated, so reflection into private JDK members fails. An old library (Lombok, Gradle, Gson, Kryo, Mockito, Spring) or your own code is calling setAccessible on a JDK class."
tldr: "Upgrade the library that appears in the stack trace (Lombok 1.18.22+, Gradle 7.3+, Mockito 4+, Spring Boot 2.5+), which is the real fix. As a workaround, open the package named in the message: `java --add-opens java.base/java.lang=ALL-UNNAMED -jar app.jar`. In Maven Surefire/Gradle tests, add the same flag to argLine/jvmArgs."
keywords: java inaccessibleobjectexception unable to make field accessible module java.base does not opens java.lang to unnamed module add-opens jdk 17 21 lombok gradle gson reflection setaccessible
related: [java-unsupportedclassversionerror, java-error-release-version-not-supported, java-gradle-could-not-resolve-all-dependencies]
---
## What it means

Java 9 introduced modules. Up to Java 15, reflective access to JDK internals (e.g. the private `value` field of `String`) still worked with an "illegal reflective access" warning. Java 16 made strong encapsulation the default and Java 17 removed the `--illegal-access` escape hatch. Now `Field.setAccessible(true)` on a non-public member of a JDK package throws `InaccessibleObjectException` unless that package is explicitly *opened*.

The message tells you exactly what's needed: module `java.base`, package `java.lang`, target `unnamed module` (code on the classpath).

## Fix 1: upgrade the library doing the reflection

Look at the frames below `setAccessible` in the stack trace to find who is calling it. Common culprits and versions that work on Java 17+:

| Library | Fixed in |
|---|---|
| Lombok | 1.18.22 (1.18.30+ for Java 21) |
| Gradle (running the build) | 7.3 for Java 17, 8.5 for Java 21 |
| Mockito | 4.x / 5.x |
| Spring Boot | 2.5+ (3.x recommended) |
| Gson | 2.10+ (avoid serializing JDK types like `Optional`, `Thread` directly) |
| Kotlin Gradle plugin, kapt | 1.5.30+ |

Bump the version in `pom.xml` / `build.gradle` and rebuild. This is the clean fix, because the flag below will keep breaking on new JDKs.

## Fix 2: open the package with --add-opens

Build the flag from the message: `--add-opens <module>/<package>=ALL-UNNAMED`.

```bash
java --add-opens java.base/java.lang=ALL-UNNAMED -jar app.jar
```

Several packages are often needed:

```bash
java --add-opens java.base/java.lang=ALL-UNNAMED \
     --add-opens java.base/java.util=ALL-UNNAMED \
     --add-opens java.base/java.lang.reflect=ALL-UNNAMED \
     -jar app.jar
```

For an executable JAR you can also put it in the manifest (no `ALL-UNNAMED` there):

```
Add-Opens: java.base/java.lang java.base/java.util
```

If you see `Unrecognized option: --add-opens`, you're running Java 8, which doesn't have modules: either drop the flag or run with Java 9+.

## Fix 3: tests (Maven Surefire, Gradle)

Tests run in a forked JVM, so pass the flag there.

Maven:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <configuration>
    <argLine>--add-opens java.base/java.lang=ALL-UNNAMED</argLine>
  </configuration>
</plugin>
```

Gradle:

```groovy
tasks.withType(Test).configureEach {
    jvmArgs '--add-opens', 'java.base/java.lang=ALL-UNNAMED'
}
```

## Fix 4: the Gradle daemon itself fails

If the error appears while Gradle starts (before your code runs), your Gradle version is too old for the JDK. Update the wrapper:

```bash
./gradlew wrapper --gradle-version 8.10
```

or set `org.gradle.java.home` in `gradle.properties` to an older JDK that your Gradle supports. Check with `./gradlew --version`.

## Fix 5: your own code

Don't reflect into JDK internals. Use public APIs instead (e.g. `String.getBytes()` instead of reading `String.value`), or `MethodHandles.privateLookupIn` for classes in your own modules. If you ship a named module that needs reflective access from a framework, add `opens com.example.model;` to `module-info.java`.

Setting `JAVA_TOOL_OPTIONS` or `JDK_JAVA_OPTIONS="--add-opens java.base/java.lang=ALL-UNNAMED"` applies the flag globally when you can't change the command line (e.g. IDE runners).
