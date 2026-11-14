---
error: "java.lang.NumberFormatException: For input string"
error_full: |
  Exception in thread "main" java.lang.NumberFormatException: For input string: "42 "
  	at java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)
  	at java.base/java.lang.Integer.parseInt(Integer.java:662)
  	at java.base/java.lang.Integer.parseInt(Integer.java:778)
  	at com.example.App.main(App.java:12)
cat: java
description: "Integer.parseInt, Long.parseLong or Double.parseDouble got a string that isn't a valid number of that type: whitespace, an empty string, decimals for an int, thousands separators, or a value out of range."
tldr: "Look at the exact string in quotes. Trim it first: `Integer.parseInt(s.trim())`. Use `Double.parseDouble` for decimals, `Long.parseLong` (or `BigInteger`) for values above 2147483647, and strip separators like `,`. Wrap parsing of user input in `try { ... } catch (NumberFormatException e)`."
keywords: java numberformatexception for input string integer parseint empty string trim whitespace decimal long out of range null parsedouble valueof
related: [java-nullpointerexception, java-arrayindexoutofboundsexception, java-outofmemoryerror-java-heap-space]
---
## What it means

The parse method only accepts a string that is *exactly* a number in its format. `Integer.parseInt` accepts an optional `+`/`-` followed by digits, and the value must fit in an `int` (−2147483648 to 2147483647). Anything else throws `NumberFormatException`.

The string between the quotes in the message is the input that failed. Look at it closely, including spaces:

| Message | Problem |
|---|---|
| `For input string: ""` | empty string |
| `For input string: "42 "` | trailing space or newline |
| `For input string: "3.14"` | decimal passed to parseInt |
| `For input string: "1,000"` | thousands separator |
| `For input string: "3000000000"` | larger than Integer.MAX_VALUE |
| `For input string: "null"` | the text "null", e.g. from `String.valueOf(null)` |
| `Cannot parse null string: null` | the argument itself was `null` |
| `For input string: "0x1F"` | hex prefix |

## Cause 1: whitespace or line endings

Input from files, `Scanner.nextLine()`, `BufferedReader` or HTTP params often carries spaces, `\r` (Windows line endings) or a BOM:

```java
int n = Integer.parseInt(line.trim());     // or line.strip() (Java 11+)
```

`strip()` also removes Unicode whitespace; neither removes a BOM (`\uFEFF`), so strip it explicitly if your file has one. The [line ending inspector](/tools/line-ending-whitespace-inspector/) shows hidden characters in a sample.

## Cause 2: empty string or null

Blank form fields and empty CSV columns give `""`. Check before parsing:

```java
if (s == null || s.isBlank()) {
    value = 0;            // or skip, or report an error
} else {
    value = Integer.parseInt(s.trim());
}
```

## Cause 3: wrong numeric type

```java
Integer.parseInt("3.14");          // NumberFormatException
double d = Double.parseDouble("3.14");
BigDecimal money = new BigDecimal("19.99");   // for money, avoid double
```

For whole numbers above `Integer.MAX_VALUE`, use `Long.parseLong`, or `new BigInteger(s)` for arbitrary size. Phone numbers, IDs with leading zeros and credit-card numbers should stay `String`s.

## Cause 4: formatted numbers and locales

`parseInt` doesn't understand `1,000`, `1 000`, `$5` or `5%`. Either clean the string:

```java
int n = Integer.parseInt(s.replaceAll("[^0-9-]", ""));
```

or parse with a locale-aware formatter:

```java
NumberFormat nf = NumberFormat.getInstance(Locale.GERMANY);
double d = nf.parse("1.234,5").doubleValue();   // 1234.5
```

## Cause 5: hex, binary or other bases

```java
Integer.parseInt("1F", 16);          // 31
Integer.decode("0x1F");              // 31, handles 0x / # / 0 prefixes
Integer.parseInt("1010", 2);         // 10
```

`Integer.parseInt("FFFFFFFF", 16)` overflows; use `Integer.parseUnsignedInt("FFFFFFFF", 16)` or `Long.parseLong`.

## Cause 6: Spring and config values

In Spring, `Failed to convert value of type 'java.lang.String' to required type 'int'; nested exception is java.lang.NumberFormatException: For input string: "abc"` means a request parameter, path variable or `@Value` property had a non-numeric value. Check the URL (`/users/abc` vs `/users/{id}`), and for properties check for unresolved placeholders like `"${PORT}"` when an env var isn't set.

## Handle bad input gracefully

```java
static OptionalInt tryParseInt(String s) {
    try {
        return OptionalInt.of(Integer.parseInt(s.trim()));
    } catch (NumberFormatException | NullPointerException e) {
        return OptionalInt.empty();
    }
}
```

With `Scanner`, check `sc.hasNextInt()` before `sc.nextInt()` (which throws `InputMismatchException`, not `NumberFormatException`).
