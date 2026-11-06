---
error: "java.util.ConcurrentModificationException"
error_full: |
  Exception in thread "main" java.util.ConcurrentModificationException
  	at java.base/java.util.ArrayList$Itr.checkForComodification(ArrayList.java:1013)
  	at java.base/java.util.ArrayList$Itr.next(ArrayList.java:967)
  	at com.example.Main.main(Main.java:12)
cat: java
description: A collection was structurally modified (add/remove) while it was being iterated, so the iterator detected the change and failed fast. It happens in single-threaded code too — usually a remove() inside a for-each loop.
tldr: "Don't call `list.remove()` inside a for-each loop. Use `list.removeIf(x -> cond)`, or an explicit `Iterator` with `it.remove()`, or collect changes and apply them after the loop. For maps use `map.entrySet().removeIf(...)`. For multi-threaded access use `ConcurrentHashMap` / `CopyOnWriteArrayList`."
keywords: java util concurrentmodificationexception arraylist itr checkforcomodification remove in for each loop iterator remove removeif hashmap concurrenthashmap copyonwritearraylist
related: [java-nullpointerexception, java-outofmemoryerror-java-heap-space, java-noclassdeffounderror]
---
## What it means

Iterators of `ArrayList`, `HashMap`, `HashSet` and most other `java.util` collections are *fail-fast*. Each collection keeps a `modCount` that increments on every structural change (add, remove, clear). The iterator remembers the value when it was created and checks it on each `next()`. If it changed by any means other than the iterator's own methods, it throws `ConcurrentModificationException`.

Despite the name, threads are usually not involved.

## Cause 1: removing inside an enhanced for loop

```java
List<String> names = new ArrayList<>(List.of("ann", "bob", "cid"));
for (String n : names) {
    if (n.startsWith("b")) {
        names.remove(n);      // CME on the next iteration
    }
}
```

The for-each loop uses a hidden iterator; `names.remove()` bypasses it.

(Removing the second-to-last element sometimes "works" because the loop ends before `next()` checks again — don't rely on that.)

## Fix 1: `removeIf` (Java 8+)

```java
names.removeIf(n -> n.startsWith("b"));
```

Clear, fast (one pass for `ArrayList`), and safe.

## Fix 2: use the iterator's own `remove()`

When the logic doesn't fit in a lambda:

```java
Iterator<String> it = names.iterator();
while (it.hasNext()) {
    String n = it.next();
    if (shouldDrop(n)) {
        it.remove();          // allowed
    }
}
```

For lists, `ListIterator` also supports `set()` and `add()` during iteration.

## Fix 3: build a new collection with streams

```java
List<String> kept = names.stream()
        .filter(n -> !n.startsWith("b"))
        .collect(Collectors.toList());    // or .toList() on Java 16+
```

## Fix 4: collect, then modify after the loop

```java
List<String> toAdd = new ArrayList<>();
for (String n : names) {
    if (n.length() == 3) toAdd.add(n.toUpperCase());
}
names.addAll(toAdd);
```

Adding inside a for-each loop throws CME just like removing.

## Cause 2: maps

```java
for (String key : map.keySet()) {
    if (map.get(key) == 0) map.remove(key);   // CME
}
```

Fix:

```java
map.entrySet().removeIf(e -> e.getValue() == 0);
// or
map.values().removeIf(v -> v == 0);
```

Updating the *value* of an existing key (`map.put(existingKey, v)` or `entry.setValue(v)`) is not a structural change and is fine. `map.computeIfAbsent(...)` inside iteration of the same `HashMap` is a structural change if it adds a key.

## Cause 3: modifying a list in a callback or nested loop

The modification is often hidden: an event listener that unregisters itself while listeners are being notified, or a method called from the loop body that adds to the same list. Look at the stack trace's last line in your code (`Main.java:12`) — that's the loop; then find who modifies the collection during it.

For listener lists, `CopyOnWriteArrayList` is the standard solution: iteration works on a snapshot, so modifications during iteration are allowed.

## Cause 4: subList and views

`list.subList(0, 5)` is a view. If you modify the original list structurally, then use the sublist, you get CME. Copy it if you need it independently: `new ArrayList<>(list.subList(0, 5))`.

## Cause 5: real multi-threaded access

If one thread iterates while another modifies, use a concurrent collection instead of a plain one:

```java
Map<String, Integer> counts = new ConcurrentHashMap<>();
List<Event> events = new CopyOnWriteArrayList<>();   // many reads, few writes
```

Their iterators are weakly consistent and never throw CME. `Collections.synchronizedList(...)` is *not* enough on its own: you must still hold the lock while iterating:

```java
synchronized (syncList) {
    for (Item i : syncList) { ... }
}
```

Note that without proper synchronisation, CME is detected only on a best-effort basis — the absence of the exception doesn't prove the code is thread-safe.
