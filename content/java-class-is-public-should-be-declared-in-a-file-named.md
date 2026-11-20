---
error: "error: class X is public, should be declared in a file named X.java"
error_full: |
  Main.java:1: error: class HelloWorld is public, should be declared in a file named HelloWorld.java
  public class HelloWorld {
         ^
  1 error
cat: java
description: "A public top-level class must live in a file with exactly the same name (case-sensitive) plus `.java`. The file name and the class name don't match."
tldr: "Rename the file to match the class (`mv Main.java HelloWorld.java`), or rename the class to match the file (`public class Main`). Names are case-sensitive: `helloworld.java` won't work for `HelloWorld`. Only one public top-level class per file."
keywords: java error class is public should be declared in a file named javac file name class name mismatch case sensitive public class online compiler main
related: [java-could-not-find-or-load-main-class, java-error-cannot-find-symbol, java-classnotfoundexception-com-mysql-cj-jdbc-driver]
---
## What it means

The Java Language Specification lets compilers require that a `public` top-level class `Foo` is declared in `Foo.java`, and `javac` enforces it. The error shows both names: the class (`HelloWorld`) and, in the prefix, the file you compiled (`Main.java`).

## Fix 1: rename the file

```bash
mv Main.java HelloWorld.java
javac HelloWorld.java
java HelloWorld
```

In an IDE, use refactor/rename on the file so references are updated.

## Fix 2: rename the class

```java
// Main.java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello");
    }
}
```

This is the fix for online compilers and coding platforms (OnlineGDB, Programiz, many judge systems) that save your code as `Main.java` — the public class must be named `Main` there.

## Cause: case doesn't match

`helloWorld.java` and `HelloWorld` are different names to `javac`, even on Windows and macOS where the filesystem is case-insensitive. Renaming only the case on those systems sometimes doesn't stick; do it in two steps:

```bash
git mv helloworld.java tmp.java
git mv tmp.java HelloWorld.java
```

(Without Git: rename to a temporary name first, then to the final name.)

## Cause: two public classes in one file

```java
public class Main { ... }
public class Helper { ... }     // error: Helper should be in Helper.java
```

Either move `Helper` to its own `Helper.java`, or drop `public` from it (package-private classes can share a file), or nest it:

```java
public class Main {
    static class Helper { ... }   // nested classes can be public or not
}
```

## Cause: a typo or extra extension

Watch for `HelloWorld.java.txt` (Windows hides known extensions by default — enable "File name extensions" in Explorer), spaces, or `HelloWorld (1).java` after a download. Check with:

```bash
ls -la
```

## Packages and directories

If the class has a `package com.example;` line, the file should also be in a matching directory, `com/example/HelloWorld.java`. That's not what this error is about, but mismatched directories cause `Could not find or load main class` later. Compile from the source root:

```bash
javac -d out com/example/HelloWorld.java
java -cp out com.example.HelloWorld
```
