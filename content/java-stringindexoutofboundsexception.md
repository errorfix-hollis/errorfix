---
error: "java.lang.StringIndexOutOfBoundsException: String index out of range"
error_full: |
  Exception in thread "main" java.lang.StringIndexOutOfBoundsException: begin 0, end 10, length 5
  	at java.base/java.lang.String.checkBoundsBeginEnd(String.java:4606)
  	at java.base/java.lang.String.substring(String.java:2709)
  	at com.example.App.main(App.java:7)

  java.lang.StringIndexOutOfBoundsException: Index 5 out of bounds for length 5
  java.lang.StringIndexOutOfBoundsException: index 5, length 5
  java.lang.StringIndexOutOfBoundsException: String index out of range: -1
cat: java
description: "A String method got a position outside 0..length-1 (charAt) or 0..length (substring). Usually an off-by-one loop, a string shorter than expected, or indexOf returning -1."
tldr: "Read the numbers in the message: `begin 0, end 10, length 5` means substring(0, 10) on a 5-char string. Check lengths first (`s.substring(0, Math.min(10, s.length()))`), loop with `i < s.length()` not `<=`, and test `indexOf(...)` for -1 before using it."
keywords: java stringindexoutofboundsexception string index out of range begin end length index out of bounds for length charat substring indexof -1 off by one
related: [java-arrayindexoutofboundsexception, java-nullpointerexception, java-numberformatexception-for-input-string]
---
## What it means

String positions run from `0` to `length() - 1`. `charAt(i)` needs `0 <= i < length()`. `substring(begin, end)` needs `0 <= begin <= end <= length()`. Any other value throws `StringIndexOutOfBoundsException`, a subclass of `IndexOutOfBoundsException`.

The message depends on the JDK version and the method, but it always contains the numbers you need:

| Message | Meaning |
|---|---|
| `begin 0, end 10, length 5` | `substring(0, 10)` on a 5-character string |
| `begin 3, end 2, length 5` | `begin` is greater than `end` |
| `Index 5 out of bounds for length 5` / `index 5, length 5` | `charAt(5)` on a 5-character string |
| `String index out of range: -1` | a negative index, usually from `indexOf` (older JDKs) |

The first `at` line from your own package is the call that failed.

## Cause 1: off-by-one in a loop

```java
for (int i = 0; i <= s.length(); i++) {   // wrong: i == length is out of range
    char c = s.charAt(i);
}
for (int i = 0; i < s.length(); i++) {    // right
    char c = s.charAt(i);
}
```

Looking ahead with `s.charAt(i + 1)` needs `i < s.length() - 1`. Reversing needs `s.charAt(s.length() - 1 - i)`.

## Cause 2: the string is shorter than you assume

```java
String code = input.substring(0, 3);       // fails for "ab" or ""
```

Guard it, or clamp the end:

```java
String code = input.length() >= 3 ? input.substring(0, 3) : input;
String preview = text.substring(0, Math.min(100, text.length()));
```

Empty strings are a common trigger: `"".charAt(0)` fails. Check `s.isEmpty()` first. User input, CSV fields and `split()` results are often empty or shorter than expected.

## Cause 3: `indexOf` returned -1

```java
String email = "no-at-sign";
String user = email.substring(0, email.indexOf('@'));   // substring(0, -1)
```

`indexOf` and `lastIndexOf` return `-1` when the text isn't found:

```java
int at = email.indexOf('@');
if (at < 0) throw new IllegalArgumentException("not an email: " + email);
String user = email.substring(0, at);
String domain = email.substring(at + 1);
```

## Cause 4: `Scanner.next().charAt(0)` on empty input

```java
char c = scanner.nextLine().charAt(0);   // fails if the user just hits Enter
```

`nextLine()` after `nextInt()` returns the leftover empty line. Read the line, `trim()` it and check `isEmpty()` before `charAt(0)`.

## Cause 5: `StringBuilder` positions

`sb.deleteCharAt(sb.length())`, `sb.insert(pos, ...)` with `pos > length()`, and `sb.setCharAt(i, c)` follow the same rules. A common bug is removing a trailing comma when the builder is empty:

```java
if (sb.length() > 0) sb.setLength(sb.length() - 1);
```

Better: use `String.join(", ", items)` or a `StringJoiner` and skip the manual trimming.

## Cause 6: index computed in bytes or code points

`s.length()` counts UTF-16 `char`s, not bytes or visible characters. An emoji uses two chars. Positions from `getBytes()` lengths, a database byte offset, or a regex on another string don't match `charAt` positions. Use `Matcher.start()`/`end()` on the same string, or `s.codePointCount(...)` / `s.offsetByCodePoints(...)` for code points.

## Debugging tip

Log the string and the computed indexes just before the call:

```java
System.err.printf("s=[%s] len=%d begin=%d end=%d%n", s, s.length(), begin, end);
```

Brackets around `s` show leading and trailing spaces. Most "impossible" cases turn out to be an extra space or newline.
