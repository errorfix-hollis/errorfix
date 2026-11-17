---
error: "error: cannot find symbol"
error_full: |
  Main.java:5: error: cannot find symbol
          List<String> names = new ArrayList<>();
          ^
    symbol:   class List
    location: class Main
  1 error
cat: java
description: "The Java compiler saw a name (class, variable or method) it can't resolve. Usually a typo, a missing import, a variable used outside its scope, or a dependency that isn't on the classpath."
tldr: "Read the `symbol:` and `location:` lines. For a class, add the import (e.g. `import java.util.List;`) or the missing dependency to Maven/Gradle; for a variable/method, fix the spelling or scope. In IDEs, if the code looks right, rebuild: `mvn clean compile` or `./gradlew clean build`."
keywords: java error cannot find symbol symbol class variable method location javac import missing maven gradle lombok intellij compile error
related: [java-classnotfoundexception-com-mysql-cj-jdbc-driver, java-noclassdeffounderror, java-gradle-could-not-resolve-all-dependencies]
---
## What it means

`javac` resolves every identifier at compile time. If it can't find a declaration for a name, it stops with `cannot find symbol`. The two lines under the error tell you exactly what's missing:

```
  symbol:   variable count          <- kind and name
  location: class Counter           <- where it looked
```

The kind is one of `class`, `variable`, `method`, or `constructor`. Diagnose based on it.

## Cause 1: missing import (`symbol: class ...`)

```java
public class Main {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();   // cannot find symbol: class List
    }
}
```

## Fix 1: import the class

```java
import java.util.ArrayList;
import java.util.List;
```

Common ones: `java.util.*` (List, Map, Scanner, Arrays), `java.io.*` (File, IOException), `java.time.*` (LocalDate). In IntelliJ press `Alt+Enter` on the red name; in Eclipse `Ctrl+Shift+O`.

## Cause 2: typo or wrong case

Java is case-sensitive. `string`, `system.out.println`, `Arraylist` and `myVar` vs `myvar` all fail:

```java
string name = "a";             // symbol: class string  -> String
System.out.printn("hi");       // symbol: method printn(String) -> println
```

## Cause 3: variable out of scope

```java
for (int i = 0; i < 10; i++) {
    int total = i * 2;
}
System.out.println(total);     // cannot find symbol: variable total
```

## Fix 3: declare it in the outer scope

```java
int total = 0;
for (int i = 0; i < 10; i++) {
    total = i * 2;
}
System.out.println(total);
```

Same for variables declared inside `try { }` and used in `catch`/`finally`.

## Cause 4: wrong method arguments or calling on the wrong type

```
  symbol:   method add(int,int)
  location: variable list of type List<String>
```

The method exists, but not with those parameter types, or not on that type. Check the signature. A frequent case: calling an instance method from `static main` without an object, or calling a subclass method through a superclass reference - cast or change the declared type.

## Cause 5: class from a dependency/other module isn't on the classpath

If the import itself fails (`error: package org.apache.commons.lang3 does not exist` plus `cannot find symbol`), the library isn't available at compile time. Add it to `pom.xml` / `build.gradle`:

```xml
<dependency>
  <groupId>org.apache.commons</groupId>
  <artifactId>commons-lang3</artifactId>
  <version>3.14.0</version>
</dependency>
```

Check its scope isn't `runtime` or `test` when used from main code. When compiling by hand:

```bash
javac -cp lib/commons-lang3-3.14.0.jar -d out src/Main.java
```

## Cause 6: Lombok getters/setters "missing"

`cannot find symbol: method getName()` on a class annotated with `@Data`/`@Getter` means Lombok's annotation processor isn't running. In Maven, make sure `lombok` is a dependency (scope `provided`) and, on JDK 23+, listed in `annotationProcessorPaths` of `maven-compiler-plugin`. In IntelliJ enable **Settings -> Build -> Compiler -> Annotation Processors -> Enable annotation processing**.

## Cause 7: stale build output

If the code is correct and the IDE shows no error, clean and rebuild:

```bash
mvn clean compile
./gradlew clean build
```

In IntelliJ: **Build -> Rebuild Project**, or **File -> Invalidate Caches**. Also check the file's `package` line matches its folder.
