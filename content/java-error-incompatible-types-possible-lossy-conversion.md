---
error: "error: incompatible types: possible lossy conversion from double to int"
error_full: |
  Main.java:5: error: incompatible types: possible lossy conversion from double to int
          int total = price * 1.2;
                            ^
  1 error
cat: java
description: "You assigned a wider numeric type (double, float, long) to a narrower one (int, short, byte, char). Java won't silently drop the fraction or high bits, so you must cast or round explicitly, or use a wider variable type."
tldr: "Either keep the wider type (`double total = price * 1.2;`) or convert explicitly: `int total = (int) (price * 1.2);` (truncates), `int total = (int) Math.round(price * 1.2);` (rounds), or `Math.toIntExact(longValue)` (throws on overflow). Watch for `long`/`double` results from `Math.pow`, `Math.round(double)` and `list.size() * 1.0`."
keywords: java incompatible types possible lossy conversion from double to int long to int int to byte float cast math.round narrowing primitive conversion
related: [java-error-cannot-find-symbol, java-numberformatexception-for-input-string, java-classcastexception]
---
## What it means

Java allows *widening* conversions automatically (`int` → `long` → `float` → `double`) but not *narrowing* ones, because they can lose information. Common variants:

- `possible lossy conversion from double to int`
- `possible lossy conversion from long to int`
- `possible lossy conversion from int to byte` / `int to char` / `int to short`
- `possible lossy conversion from double to float`

The compiler points at the expression whose type is too wide.

## Cause 1: arithmetic with a double literal

Any operation involving a `double` produces a `double`:

```java
int price = 100;
int total = price * 1.2;          // error: result is double
```

Choose what you want:

```java
double total = price * 1.2;                 // keep the fraction
int total = (int) (price * 1.2);            // truncate toward zero: 119.99 -> 119
int total = (int) Math.round(price * 1.2);  // round to nearest
```

Note the parentheses: `(int) price * 1.2` casts only `price` and still yields a double.

For money, use `BigDecimal` or integer cents rather than `double`.

## Cause 2: Math methods return double or long

```java
int sq = Math.pow(n, 2);          // Math.pow returns double
int r  = Math.round(3.7);         // Math.round(double) returns long
int r2 = Math.round(3.7f);        // OK: Math.round(float) returns int
int c  = Math.ceil(x / 2.0);      // ceil/floor return double
```

Fixes:

```java
int sq = n * n;
int r  = (int) Math.round(3.7);
int c  = (int) Math.ceil(x / 2.0);
```

## Cause 3: long to int

`System.currentTimeMillis()`, `File.length()`, `Duration.toMillis()` and stream `count()` return `long`:

```java
int n = list.stream().filter(x -> x > 0).count();   // error
```

Use a `long` variable, or convert safely:

```java
long n = list.stream().filter(x -> x > 0).count();
int n2 = Math.toIntExact(n);     // throws ArithmeticException if it overflows int
```

A plain `(int) n` cast silently wraps around for values above 2,147,483,647.

## Cause 4: byte, short and char arithmetic

Arithmetic on `byte`, `short` and `char` is done in `int`, so the result needs a cast back:

```java
byte b = 10;
b = b + 1;          // error: int to byte
b += 1;             // OK: compound assignment includes an implicit cast
b = (byte) (b + 1); // OK

char c = 'a';
c = c + 1;          // error: int to char
c = (char) (c + 1); // 'b'
```

Constant expressions that fit are allowed: `byte x = 100;` compiles, `byte y = 200;` does not.

## Cause 5: array index or method argument

Array indexes must be `int`, and arguments aren't narrowed automatically:

```java
long i = 3;
arr[i] = 5;                 // error: long to int
arr[(int) i] = 5;           // OK

void setAge(int age) {}
setAge(25.0);               // error
setAge(25);                 // OK
```

## Cause 6: switch or ternary mixing types

`int x = flag ? 1 : 2.5;` is a `double` expression. Make both branches the same type.

## Which conversion to pick

Truncation `(int)` drops the fraction; `Math.round` rounds half up; `Math.floor`/`Math.ceil` round down/up but still need a cast. If overflow would be a bug, prefer `Math.toIntExact`, which fails loudly.
