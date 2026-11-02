---
error: "java.lang.NoClassDefFoundError"
error_full: |
  Exception in thread "main" java.lang.NoClassDefFoundError: org/apache/commons/lang3/StringUtils
      at com.example.App.main(App.java:9)
  Caused by: java.lang.ClassNotFoundException: org.apache.commons.lang3.StringUtils
  java.lang.NoClassDefFoundError: Could not initialize class com.example.Config
cat: java
description: A class that was present when your code was compiled can't be loaded at runtime. Either the JAR containing it is missing from the runtime classpath, or the class exists but its static initializer failed earlier.
tldr: "If there's a `Caused by: ClassNotFoundException`, put the dependency on the runtime classpath: build a fat jar (Maven Shade / Gradle Shadow or Spring Boot plugin), or run with `java -cp app.jar:lib/* com.example.App`. For `Could not initialize class X`, scroll up to the first `ExceptionInInitializerError` and fix the exception thrown in X's static block."
keywords: java noclassdeffounderror could not initialize class classnotfoundexception runtime classpath fat jar maven shade gradle shadow exceptionininitializererror scope provided dependency conflict
related: [java-classnotfoundexception-com-mysql-cj-jdbc-driver, java-could-not-find-or-load-main-class, java-unsupportedclassversionerror]
---
## What it means

`NoClassDefFoundError` is thrown when the JVM needs a class definition (because your code references it) and can't get one. It is an `Error`, not an exception: the compiler saw the class, so the code compiled; the problem is the runtime environment.

There are two very different variants:

1. `NoClassDefFoundError: org/foo/Bar` with `Caused by: ClassNotFoundException` → the class isn't on the runtime classpath.
2. `NoClassDefFoundError: Could not initialize class org.foo.Bar` → the class was found, but its static initialization already failed once.

## Fix 1: dependency missing at runtime

Running a plain jar with `java -jar app.jar` uses **only** that jar plus whatever its manifest `Class-Path` lists. Dependencies from Maven/Gradle are not included automatically.

Build a self-contained ("fat"/"uber") jar.

Maven, with the Shade plugin:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-shade-plugin</artifactId>
  <version>3.5.1</version>
  <executions>
    <execution>
      <phase>package</phase>
      <goals><goal>shade</goal></goals>
      <configuration>
        <transformers>
          <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
            <mainClass>com.example.App</mainClass>
          </transformer>
        </transformers>
      </configuration>
    </execution>
  </executions>
</plugin>
```

Gradle, with the Shadow plugin (`./gradlew shadowJar`), or use the `application` plugin and run `./gradlew installDist`, which creates a start script with the full classpath.

Or pass the classpath yourself (`:` on Linux/macOS, `;` on Windows):

```bash
java -cp "app.jar:lib/*" com.example.App
```

Note `-cp` is ignored when you use `-jar`.

## Fix 2: wrong dependency scope

In Maven, `<scope>provided</scope>` or `test` means "not on the runtime classpath". In Gradle, `compileOnly` does the same. Use `compile`/default scope in Maven or `implementation`/`runtimeOnly` in Gradle for anything needed at runtime — unless your container (Tomcat, Spark) really provides it.

Check what's actually included:

```bash
mvn dependency:tree
./gradlew dependencies --configuration runtimeClasspath
jar tf target/app.jar | grep StringUtils
```

## Fix 3: version conflicts

If the missing class belongs to a library you *do* have, another dependency may pull in an older version without that class (or a newer one that removed it). Look for duplicate artifacts in the dependency tree and pin one version with `<dependencyManagement>` (Maven) or a constraint (Gradle). Common examples: `javax.*` vs `jakarta.*` packages after Spring Boot 3 / Jakarta EE 9 migrations, and mixed Jackson or Netty versions.

## Fix 4: `Could not initialize class X`

The JVM tried to run class `X`'s static initializer (static fields, `static {}` blocks), it threw, and the class is now permanently unusable in that JVM. Every later use throws this `NoClassDefFoundError`.

The real cause is earlier in the log — search for the **first** `java.lang.ExceptionInInitializerError` and its `Caused by`. Typical culprits:

- A static field reading a config file or env var that doesn't exist.
- A native library failing to load (`UnsatisfiedLinkError`).
- A static logger or connection created with a bad setting.

Fix that exception; restarting the JVM is required.

## Fix 5: IDE vs command line, stale builds

If it works in the IDE but not from the terminal (or vice versa), the classpaths differ. Rebuild cleanly:

```bash
mvn clean package
./gradlew clean build
```

In app servers, make sure the JAR is in `WEB-INF/lib` and not duplicated in the server's shared `lib` folder, which causes class-loader conflicts.
