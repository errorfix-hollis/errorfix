---
error: "error: missing return statement"
error_full: |
  Main.java:9: error: missing return statement
      }
      ^
  1 error
cat: java
description: "A method with a non-void return type has at least one path through it that reaches the end without returning a value or throwing. javac checks every path, including loops and if/else branches it cannot prove are exhaustive."
tldr: "Make sure every path ends in `return value;` or `throw`: add an `else` branch or a final `return` after the if/loop, or `throw new IllegalStateException()` for impossible cases. If the method shouldn't return anything, declare it `void`."
keywords: java error missing return statement javac compile error method must return a result if else loop switch try catch void unreachable statement
related: [java-error-cannot-find-symbol, java-error-incompatible-types-possible-lossy-conversion, java-class-is-public-should-be-declared-in-a-file-named]
---
## What it means

The Java compiler does *definite-completion* analysis: for a method declared as returning `int`, `String`, etc., the end of the method body must be unreachable. If any path could "fall off" the closing brace, javac reports `missing return statement`, pointing at that brace. It does not evaluate your conditions at runtime, so it cannot know that "one of these ifs is always true".

## Cause 1: `if` without `else`

```java
static String grade(int score) {
    if (score >= 50) {
        return "pass";
    } else if (score < 50) {
        return "fail";
    }
}   // error: compiler can't prove the two conditions cover everything
```

Fix with a plain `else` or a final return:

```java
static String grade(int score) {
    if (score >= 50) {
        return "pass";
    }
    return "fail";
}
```

## Cause 2: return only inside a loop

```java
static int indexOf(int[] arr, int target) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] == target) return i;
    }
}   // error: loop might finish without returning
```

Add a result for the "not found" case:

```java
    }
    return -1;
}
```

Note `while (true) { ... }` with no `break` is fine: javac knows the end is unreachable.

## Cause 3: `switch` that isn't exhaustive

A classic `switch` statement without `default` can fall through:

```java
static int days(String month) {
    switch (month) {
        case "FEB": return 28;
        case "APR": return 30;
    }
    return 31;            // needed, or add default: return 31;
}
```

On Java 14+ prefer a switch *expression*; for enums and sealed types, the compiler checks exhaustiveness for you:

```java
static int days(Month m) {
    return switch (m) {
        case FEBRUARY -> 28;
        case APRIL, JUNE, SEPTEMBER, NOVEMBER -> 30;
        default -> 31;
    };
}
```

## Cause 4: try/catch where the catch doesn't return

```java
static int parse(String s) {
    try {
        return Integer.parseInt(s);
    } catch (NumberFormatException e) {
        System.out.println("bad number");
    }   // falls through here
}
```

Return a fallback, or rethrow:

```java
    } catch (NumberFormatException e) {
        throw new IllegalArgumentException("Not a number: " + s, e);
    }
```

## Cause 5: impossible cases

When you know a branch can't happen, say so with an exception instead of a dummy value. This also satisfies the compiler:

```java
throw new IllegalStateException("unreachable: " + state);
```

## Cause 6: the method should be `void`

If you only print or modify state, change the signature:

```java
static void printTotal(int[] values) { ... }
```

## Related: `unreachable statement`

The opposite error, `error: unreachable statement`, means code comes *after* a `return`, `break`, `continue` or `throw` in the same block. Delete it or move it before the return.
