---
error: "java.lang.IllegalArgumentException: Comparison method violates its general contract!"
error_full: |
  Exception in thread "main" java.lang.IllegalArgumentException: Comparison method violates its general contract!
  	at java.base/java.util.TimSort.mergeHi(TimSort.java:903)
  	at java.base/java.util.TimSort.mergeAt(TimSort.java:520)
  	at java.base/java.util.TimSort.mergeCollapse(TimSort.java:448)
  	at java.base/java.util.TimSort.sort(TimSort.java:245)
  	at java.base/java.util.Arrays.sort(Arrays.java:1307)
  	at java.base/java.util.ArrayList.sort(ArrayList.java:1721)
  	at java.base/java.util.Collections.sort(Collections.java:179)
cat: java
description: "Your Comparator or compareTo is inconsistent (not transitive, not symmetric, or changes while sorting), and Java's TimSort detected it. Fix the comparison logic; the sort is not the bug."
tldr: "Replace hand-written comparisons with `Integer.compare(a, b)`, `Double.compare(a, b)` or `Comparator.comparing(...).thenComparing(...)`. Never return `a - b` for ints, always return 0 for equal values, handle null/NaN consistently, and don't sort on fields that change during the sort."
keywords: java illegalargumentexception comparison method violates its general contract timsort comparator compareto transitive integer.compare subtraction overflow nan useLegacyMergeSort collections.sort
related: [java-concurrentmodificationexception, java-nullpointerexception, java-outofmemoryerror-java-heap-space]
---
## What it means

`Collections.sort`, `List.sort` and `Arrays.sort` on objects use TimSort, which relies on the comparator obeying the contract:

- **sign symmetry**: `sgn(compare(a, b)) == -sgn(compare(b, a))`
- **transitivity**: if `a > b` and `b > c`, then `a > c`
- **consistency**: if `compare(a, b) == 0`, then `a` and `b` compare the same against everything else

When TimSort notices a contradiction during a merge, it throws this exception. It only fails for some inputs (usually 32+ elements, specific orderings), so it often shows up only in production.

## Cause 1: returning `a - b`

```java
list.sort((x, y) -> x.getScore() - y.getScore());   // overflows
```

With large or negative numbers the subtraction overflows and flips the sign (`Integer.MIN_VALUE - 1` is positive), breaking transitivity. Use:

```java
list.sort(Comparator.comparingInt(Item::getScore));
// or
list.sort((x, y) -> Integer.compare(x.getScore(), y.getScore()));
```

For `long` use `Long.compare`. Casting a `long` or `double` difference to `int` (`(int)(a - b)`) has the same problem.

## Cause 2: never returning 0

```java
(a, b) -> a.getPriority() > b.getPriority() ? 1 : -1   // equal -> -1 both ways
```

For equal values, `compare(a, b)` and `compare(b, a)` both return -1, violating symmetry. Return 0 for equal elements; the `Comparator` helpers do this for you:

```java
Comparator.comparingInt(Task::getPriority)
          .thenComparing(Task::getName);
```

## Cause 3: floating point and NaN

```java
(a, b) -> a.price < b.price ? -1 : (a.price > b.price ? 1 : 0)
```

`NaN` compares as neither less nor greater, so it's "equal" to everything, breaking transitivity. `Double.compare` defines a total order (NaN is largest, `-0.0 < 0.0`):

```java
Comparator.comparingDouble(p -> p.price)
```

## Cause 4: inconsistent null handling

A comparator that returns -1 when *either* side is null is not symmetric. Use the null-safe wrappers:

```java
Comparator.comparing(User::getLastName, Comparator.nullsLast(Comparator.naturalOrder()))
```

## Cause 5: values change during the sort

Sorting by something that isn't stable during the sort breaks consistency: `System.currentTimeMillis()`, random numbers (`(a, b) -> random.nextInt(3) - 1` to "shuffle"), cached values updated by another thread, or a `Map` lookup that's being modified concurrently.

- To shuffle, use `Collections.shuffle(list)`.
- Snapshot the sort key first, or sort a copy of immutable data.

## Cause 6: mixed comparison rules

Comparators with special cases ("pinned items first, then by date, but drafts are equal to everything") often violate transitivity. Express the rules as a chain of keys instead:

```java
Comparator.comparing(Post::isPinned).reversed()
          .thenComparing(Post::getDate, Comparator.reverseOrder())
```

The same applies to `compareTo` in classes implementing `Comparable`.

## Finding the bad comparator

Write a quick check over a sample of real data that asserts symmetry and transitivity on all triples (or use a property-based testing library). It will point at the exact elements that break the contract.

## About `useLegacyMergeSort`

`-Djava.util.Arrays.useLegacyMergeSort=true` switches back to the old merge sort, which doesn't throw. It only hides the bug — the result can still be incorrectly ordered — and the option may be removed in future JDKs. Fix the comparator instead.
