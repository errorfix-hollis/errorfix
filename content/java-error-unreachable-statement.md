---
error: "error: unreachable statement"
error_full: |
  Main.java:7: error: unreachable statement
          System.out.println("done");
          ^
  1 error
cat: java
description: "The compiler proved that a statement can never execute, because it comes after `return`, `throw`, `break`, `continue`, or an infinite loop. Java treats this as a compile error, not a warning."
tldr: "Move or delete the code after the `return`/`throw`/`break`/`continue`. If you temporarily wanted to skip code, wrap it in `if (true) return;` or comment it out. For code after `while (true)` without a `break`, add a `break` condition or remove the trailing code."
keywords: java error unreachable statement after return throw break continue while true for loop infinite loop compile error javac missing return statement dead code
related: [java-error-missing-return-statement, java-error-cannot-find-symbol, java-class-is-public-should-be-declared-in-a-file-named]
---
## What it means

The Java Language Specification (JLS 14.22) requires every statement to be *reachable* by a simple flow analysis. If a statement can't be reached, `javac` stops with `unreachable statement`. The caret points at the first dead statement; the cause is usually just above it.

## Cause 1: code after return or throw

```java
int total(int[] xs) {
    int sum = 0;
    for (int x : xs) sum += x;
    return sum;
    System.out.println("sum computed");   // error
}
```

Move it before the return:

```java
    System.out.println("sum computed");
    return sum;
```

Same for `throw`:

```java
throw new IllegalStateException("bad state");
cleanup();   // error: never runs
```

Use `finally` if the code must run in both cases.

## Cause 2: code after break or continue in a loop/switch

```java
for (String s : items) {
    if (s.isEmpty()) {
        continue;
        count++;          // error
    }
}

switch (cmd) {
    case "stop":
        running = false;
        break;
        log("stopped");   // error
}
```

Put the statement before `break`/`continue`.

## Cause 3: code after an infinite loop

```java
while (true) {
    handle(queue.take());
}
System.out.println("exit");   // error: loop never ends normally
```

The compiler knows `while (true)` (or `for (;;)`) without a `break` never completes. Add an exit:

```java
while (running) {
    handle(queue.take());
}
System.out.println("exit");
```

or `break` out of it on a condition. Note `while (flag)` with a non-constant variable is fine; only constant `true` triggers the analysis.

## Cause 4: temporarily disabling code with return

A quick `return;` at the top of a method to skip the rest fails to compile. Use a condition the compiler doesn't treat as constant-folded dead code:

```java
if (true) return;     // allowed: if statements are exempt from this check
```

The JLS deliberately exempts `if` so you can do conditional compilation like `if (DEBUG) { ... }`. Commenting out the code is cleaner.

## Cause 5: catch block for an exception that can't be thrown

A related compile error: `exception IOException is never thrown in body of corresponding try statement`. Also, catching a subclass after its superclass gives `exception FileNotFoundException has already been caught`:

```java
try { ... }
catch (IOException e) { ... }
catch (FileNotFoundException e) { ... }   // error: already caught
```

Order catch blocks from most specific to most general.

## Related: missing return statement

The opposite analysis: a method's end is reachable but it must return a value. See [missing return statement](/java/java-error-missing-return-statement/).

## Kotlin and IDEs

Kotlin reports `Unreachable code` only as a warning. IntelliJ highlights dead code in grey before you compile, which is the quickest way to spot it.
