---
error: "java.util.InputMismatchException"
error_full: |
  Exception in thread "main" java.util.InputMismatchException
  	at java.base/java.util.Scanner.throwFor(Scanner.java:947)
  	at java.base/java.util.Scanner.next(Scanner.java:1602)
  	at java.base/java.util.Scanner.nextInt(Scanner.java:2267)
  	at java.base/java.util.Scanner.nextInt(Scanner.java:2221)
  	at com.example.Main.main(Main.java:9)
cat: java
description: "Scanner.nextInt(), nextDouble() and similar found a token that isn't a valid number of that type, e.g. letters, a decimal for nextInt, or 3.5 when the locale expects 3,5."
tldr: "Check with `hasNextInt()` before `nextInt()` and discard bad input with `next()`. For decimals, set the locale: `new Scanner(System.in).useLocale(Locale.US)`. Or read whole lines with `nextLine()` and parse with `Integer.parseInt(line.trim())` inside a try/catch."
keywords: java util inputmismatchexception scanner nextint nextdouble hasnextint locale decimal comma useLocale nextline skipped input validation loop
related: [java-numberformatexception-for-input-string, java-stringindexoutofboundsexception, java-nullpointerexception]
---
## What it means

`Scanner` splits input into tokens (separated by whitespace by default). `nextInt()` takes the next token and tries to read it as an `int`. If the token is `abc`, `4.5`, `99999999999` (too big for int), or `1,000`, it throws `InputMismatchException`. The bad token is **not consumed**. It stays in the buffer, so calling `nextInt()` again in a loop fails forever.

The exception message is often empty. Print the token to see what Scanner got:

```java
if (!sc.hasNextInt()) System.err.println("bad token: [" + sc.next() + "]");
```

## Cause 1: the user typed something that isn't a number

Validate with `hasNextInt()` and throw away bad tokens:

```java
Scanner sc = new Scanner(System.in);
int age;
while (true) {
    System.out.print("Age: ");
    if (sc.hasNextInt()) {
        age = sc.nextInt();
        break;
    }
    System.out.println("Please enter a whole number.");
    sc.next();            // consume the bad token, or the loop never ends
}
```

Without `sc.next()` (or `sc.nextLine()`) the same bad token is checked again and again, which gives an infinite loop.

## Cause 2: decimals and the locale

`nextDouble()` uses your system locale. In German, French, Portuguese, South African and many other locales the decimal separator is a comma, so `3.5` throws and `3,5` works. Make it predictable:

```java
Scanner sc = new Scanner(System.in).useLocale(Locale.US);   // expects 3.5
double price = sc.nextDouble();
```

Also, `nextInt()` on `3.5` always fails. Use `nextDouble()` or round explicitly.

## Cause 3: reading a file with the wrong token order

When parsing a data file, the column order, a header line, or extra text (`Score: 42`) makes `nextInt()` hit a word:

```java
try (Scanner in = new Scanner(Path.of("scores.txt"))) {
    in.nextLine();                    // skip header
    while (in.hasNext()) {
        String name = in.next();
        int score = in.nextInt();
    }
}
```

Names with spaces ("Mary Ann") shift every token after them. For structured files, read line by line and `split`, or use a CSV library.

Watch the file encoding too: a UTF-8 BOM at the start makes the first token `\uFEFF42`, which isn't an int. Save without BOM or strip it.

## Cause 4: value out of range

`nextInt()` accepts only -2147483648 to 2147483647. For bigger numbers use `nextLong()` or `nextBigInteger()`.

## Robust pattern: read lines, then parse

Mixing `nextInt()` and `nextLine()` also causes the "nextLine is skipped" bug: `nextInt()` leaves the newline behind, and the next `nextLine()` returns `""`. Reading whole lines avoids both problems:

```java
Scanner sc = new Scanner(System.in);
while (true) {
    System.out.print("Quantity: ");
    String line = sc.nextLine().trim();
    try {
        int qty = Integer.parseInt(line);
        break;
    } catch (NumberFormatException e) {
        System.out.println("Not a number: " + line);
    }
}
```

`Integer.parseInt` throws [NumberFormatException](/java/java-numberformatexception-for-input-string/) instead. It's the same idea, but the message includes the bad input.

## `NoSuchElementException` instead?

That means there was no token at all: input ended (Ctrl+D or Ctrl+Z, end of file, or no stdin in an IDE or CI run), or you closed a `Scanner` on `System.in` earlier. Closing it closes `System.in` for the whole program. Create one Scanner and keep it open.
