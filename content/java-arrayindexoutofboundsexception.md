---
error: "java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5"
error_full: |
  Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5
  	at com.example.Main.main(Main.java:8)
cat: java
description: "Code accessed an array position that doesn't exist. Valid indexes run from 0 to length - 1, so index == length (an off-by-one loop) or a negative index throws this."
tldr: "Use `i < arr.length` (not `<=`) in loops, or a for-each loop. Check `args.length` before reading `args[0]`. Validate indexes from input or `indexOf()` (which returns -1) before using them. The message tells you the bad index and the array length."
keywords: java arrayindexoutofboundsexception index out of bounds for length off by one loop args[0] length minus 1 negative index split indexoutofboundsexception
related: [java-nullpointerexception, java-concurrentmodificationexception, java-could-not-find-or-load-main-class]
---
## What it means

Java arrays are zero-based: an array of length 5 has indexes `0` to `4`. Accessing any other index throws `ArrayIndexOutOfBoundsException`. Since Java 11 the message says exactly what happened:

```
Index 5 out of bounds for length 5     → off by one (index == length)
Index -1 out of bounds for length 3    → negative index, often from indexOf()
Index 0 out of bounds for length 0     → the array is empty
```

The first `at` line of the stack trace that is in your code (`Main.java:8`) is where the bad access happened.

## Cause 1: `<=` instead of `<` in a loop

```java
int[] nums = {1, 2, 3, 4, 5};
for (int i = 0; i <= nums.length; i++) {   // i reaches 5
    System.out.println(nums[i]);
}
```

Fix:

```java
for (int i = 0; i < nums.length; i++) { ... }

// or, if you don't need the index
for (int n : nums) { System.out.println(n); }
```

The last element is `nums[nums.length - 1]`, not `nums[nums.length]`.

## Cause 2: reading `args[0]` with no command-line arguments

```java
public static void main(String[] args) {
    String file = args[0];   // Index 0 out of bounds for length 0
}
```

`args` is empty when you run `java Main` without arguments (also the default when you press Run in an IDE). Check first:

```java
if (args.length < 1) {
    System.err.println("Usage: java Main <file>");
    System.exit(1);
}
```

In IntelliJ set arguments in **Run → Edit Configurations → Program arguments**; in Eclipse under **Run Configurations → Arguments**.

## Cause 3: `split()` returned fewer parts than expected

```java
String line = "alice";
String[] parts = line.split(",");
String email = parts[1];     // Index 1 out of bounds for length 1
```

Lines in CSV files are often shorter than expected, or blank. Also, `split` drops trailing empty strings: `"a,b,,".split(",")` has length 2. Check the length, and pass `-1` to keep trailing empties:

```java
String[] parts = line.split(",", -1);
if (parts.length < 2) { /* skip or report bad line */ }
```

## Cause 4: negative index from `indexOf` or arithmetic

`indexOf` returns `-1` when the value isn't found:

```java
int i = Arrays.asList(names).indexOf("zoe");
String next = names[i + 1];     // fine... unless i is the last index
String prev = names[i - 1];     // -2 if not found, -1 if i == 0
```

Validate before using: `if (i > 0) { ... }`. Watch also for `i - 1` in loops starting at `0`, and `hash % length`, which is negative for negative hashes (use `Math.floorMod(hash, length)`).

## Cause 5: array created with the wrong size

```java
int[] counts = new int[10];
counts[score] ++;            // fails for score == 10
```

If values go from 0 to 10 inclusive you need `new int[11]`. If the size isn't known up front, use an `ArrayList` instead of an array.

## Cause 6: nested arrays with different lengths

```java
for (int i = 0; i < grid.length; i++)
    for (int j = 0; j < grid.length; j++)      // wrong: should be grid[i].length
        sum += grid[i][j];
```

## Related exceptions

- `IndexOutOfBoundsException: Index 3 out of bounds for length 3` comes from `List.get()` (e.g. `ArrayList`). Same fixes; use `list.size()`.
- `StringIndexOutOfBoundsException` comes from `charAt()` or `substring()` with an index past `length()`.

## Debugging tip

Set a breakpoint on the exception: in IntelliJ **Run → View Breakpoints → + → Java Exception Breakpoints → ArrayIndexOutOfBoundsException**. The debugger stops at the exact access, with the index and array visible.
