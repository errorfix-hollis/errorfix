---
error: "Error: Could not find or load main class"
error_full: |
  Error: Could not find or load main class Main
  Caused by: java.lang.ClassNotFoundException: Main
cat: java
description: The JVM couldn't find the class you asked it to run on the classpath. Usually you ran it from the wrong directory, used the file name instead of the fully qualified class name, or forgot the package folder.
tldr: "Run from the classpath root with the fully qualified name, without .class: `javac -d out src/com/example/Main.java && java -cp out com.example.Main`. For a single file on Java 11+: `java Main.java`."
keywords: java error could not find or load main class classnotfoundexception classpath package javac jar manifest Main-Class intellij
related: [java-unsupportedclassversionerror, java-home-is-not-set]
---
## What it means

`java X` searches the classpath (by default the current directory) for `X.class`, respecting packages as folders. If it can't find it, you get this error.

## Cause 1: you included `.class` or `.java`

```bash
java Main.class      # wrong
java Main            # right
```

(On Java 11+, `java Main.java` is valid: it compiles and runs a single source file.)

## Cause 2: the class is in a package

```java
package com.example;
public class Main { ... }
```

The compiled file must live at `com/example/Main.class` and you must use the full name from the root folder:

```bash
javac -d out src/com/example/Main.java
java -cp out com.example.Main
```

Running `java Main` inside `com/example/` fails because the JVM expects `com.example.Main`.

## Cause 3: wrong classpath

If you set `-cp` or the `CLASSPATH` environment variable, the current directory is no longer included automatically:

```bash
java -cp lib/gson.jar Main          # can't find Main
java -cp lib/gson.jar:. Main        # Linux/macOS
java -cp "lib/gson.jar;." Main      # Windows
```

Check for a stray global `CLASSPATH`: `echo $CLASSPATH`.

## Cause 4: running a jar

```bash
java -jar app.jar
```

needs `Main-Class: com.example.Main` in `META-INF/MANIFEST.MF`. With Maven, configure `maven-jar-plugin` (or Spring Boot's plugin); with Gradle, set `application { mainClass = 'com.example.Main' }` and use `./gradlew run` or build a fat jar.

## Cause 5: IDE out of sync

IntelliJ: *Build → Rebuild Project*, check the Run Configuration's main class and module, or *File → Invalidate Caches*. Eclipse: *Project → Clean*.

## Cause 6: special characters in the path

Paths with non-ASCII characters or `%` / `!` can break class loading on some systems. Move the project to a simple path.
