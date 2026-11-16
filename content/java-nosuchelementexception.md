---
error: "java.util.NoSuchElementException"
error_full: |
  Exception in thread "main" java.util.NoSuchElementException
  	at java.base/java.util.Scanner.throwFor(Scanner.java:937)
  	at java.base/java.util.Scanner.next(Scanner.java:1594)
  	at java.base/java.util.Scanner.nextInt(Scanner.java:2258)
  	at Main.main(Main.java:8)
cat: java
description: "You asked for the next element of something that has none left: Scanner input that is exhausted or closed, an Iterator past its end, Optional.get() on an empty Optional, or a list/queue method on an empty collection."
tldr: "Check before reading: `while (sc.hasNextInt()) { int n = sc.nextInt(); }`, `if (it.hasNext()) it.next()`, and use `optional.orElse(...)`/`orElseThrow(...)` instead of `get()`. Never close a Scanner wrapping `System.in` and create one Scanner for the whole program."
keywords: java.util.nosuchelementexception scanner nextint nextline no line found iterator next optional get no value present system.in closed scanner hasnext
related: [java-inputmismatchexception, java-nullpointerexception, java-concurrentmodificationexception]
---
## What it means

`NoSuchElementException` is thrown by "give me the next one" methods when there is no next one. The top frame of the stack trace tells you which API:

| Top frame | Message | Section |
|---|---|---|
| `Scanner.next/nextInt/nextLine` | *(none)* or `No line found` | Cause 1-2 |
| `Iterator.next`, `ArrayList$Itr.next` | *(none)* | Cause 3 |
| `Optional.get` / `orElseThrow()` | `No value present` | Cause 4 |
| `LinkedList.getFirst`, `ArrayDeque.removeFirst`, `TreeSet.first` | *(none)* | Cause 5 |

## Cause 1: Scanner reached end of input

`nextInt()`, `next()` and `nextLine()` throw when the input stream has ended. This happens when reading a file with fewer tokens than expected, when piping input (`java Main < input.txt`), or on online judges/IDEs that run your program with empty stdin.

Always guard reads:

```java
Scanner sc = new Scanner(System.in);
while (sc.hasNextInt()) {
    int n = sc.nextInt();
    // ...
}

if (sc.hasNextLine()) {
    String line = sc.nextLine();
}
```

In IntelliJ/Eclipse, make sure you actually type input in the Run console. In VS Code, set `"console": "integratedTerminal"` in `launch.json` — the Debug Console does not accept stdin.

## Cause 2: a Scanner on System.in was closed

Closing a `Scanner` closes the stream it wraps. Once `System.in` is closed, every new Scanner on it throws `NoSuchElementException` immediately:

```java
// Wrong
static int readInt() {
    Scanner sc = new Scanner(System.in);
    int n = sc.nextInt();
    sc.close();            // closes System.in for the whole JVM
    return n;
}
// second call to readInt() -> NoSuchElementException
```

Create one Scanner and share it; don't close it (or close it once at the very end of `main`):

```java
private static final Scanner SC = new Scanner(System.in);

static int readInt() {
    return SC.nextInt();
}
```

Also avoid try-with-resources around a `Scanner(System.in)` for the same reason.

## Cause 3: Iterator.next() past the end

```java
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    String a = it.next();
    String b = it.next();     // throws when the list has an odd size
}
```

Call `next()` exactly once per `hasNext()` check, or use an enhanced `for` loop. The same applies to `StringTokenizer.nextToken()` — check `hasMoreTokens()` first.

## Cause 4: Optional.get() on an empty Optional

```java
User u = repo.findById(id).get();   // NoSuchElementException: No value present
```

Handle the empty case explicitly:

```java
User u = repo.findById(id)
        .orElseThrow(() -> new UserNotFoundException(id));

String name = repo.findById(id).map(User::getName).orElse("unknown");
```

Streams: `list.stream().filter(...).findFirst().get()` and `stream.max(...).get()` fail the same way on empty results.

## Cause 5: first/last element of an empty collection

`LinkedList.getFirst()`, `removeFirst()`, `element()`, `ArrayDeque.removeFirst()`, `TreeSet.first()`, `TreeMap.firstKey()` and (Java 21) `List.getFirst()` throw on empty collections. Check `isEmpty()` or use the null-returning variants:

| Throws | Returns null instead |
|---|---|
| `removeFirst()` / `remove()` | `pollFirst()` / `poll()` |
| `getFirst()` / `element()` | `peekFirst()` / `peek()` |
| `TreeMap.firstKey()` | `firstEntry()` |

## Quick checklist

1. Read the top stack frame to see which API threw.
2. Add a `hasNext*()` / `isPresent()` / `isEmpty()` check before the call.
3. For Scanner on `System.in`: one instance, never closed mid-program.
