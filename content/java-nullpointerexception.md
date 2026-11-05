---
error: "java.lang.NullPointerException: Cannot invoke \"String.length()\" because \"<local1>\" is null"
error_full: |
  Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "name" is null
  	at com.example.App.greet(App.java:12)
  	at com.example.App.main(App.java:5)
cat: java
description: Code dereferenced a reference that is null — called a method, read a field, indexed an array, unboxed a number or synchronized on it. Since Java 14, the message names exactly which expression was null.
tldr: "Read the helpful message (`because \"x\" is null`) and the first `at` line in your code. Find where that value should have been set: an uninitialized field, a map/repository lookup that returned null, a missing injection, or an unboxed null Integer. Fix it at the source, or handle absence explicitly with `Objects.requireNonNull`, `Optional`, or a null check."
keywords: java lang nullpointerexception cannot invoke because is null helpful nullpointerexceptions npe stack trace null check optional spring autowired null unboxing map get
related: [java-noclassdeffounderror, java-outofmemoryerror-java-heap-space, java-could-not-find-or-load-main-class]
---
## What it means

You used `null` as if it were an object. Since JDK 14 (default on since 15), *helpful NullPointerException* messages say what was null:

- `Cannot invoke "String.length()" because "name" is null`
- `Cannot read field "address" because "user" is null`
- `Cannot load from int array because "arr" is null`
- `Cannot invoke "java.lang.Integer.intValue()" because ... is null` (unboxing)

If the message says `"<local1>"` instead of a variable name, the class was compiled without debug info; compile with `javac -g` (Maven/Gradle do this by default) to see names.

The first `at` line pointing to **your** package is where it happened. On older JDKs with no message, split chained calls across lines so the line number tells you which part was null.

## Cause 1: an uninitialized field

```java
class Cart {
    private List<Item> items;           // null
    void add(Item i) { items.add(i); }  // NPE
}
```

Initialise at declaration or in the constructor:

```java
private final List<Item> items = new ArrayList<>();
```

## Cause 2: a lookup returned null

`Map.get`, `HttpServletRequest.getParameter`, `System.getenv`, `Class.getResource`, many DAO methods and JSON libraries return `null` when something isn't there.

```java
String port = System.getenv("PORT");
int p = Integer.parseInt(port);               // NumberFormatException: null, or NPE later
```

Handle the absent case:

```java
int p = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));

User u = repo.findById(id)                    // Optional<User> in Spring Data
             .orElseThrow(() -> new NotFoundException(id));
```

## Cause 3: auto-unboxing a null wrapper

```java
Map<String, Integer> counts = new HashMap<>();
int c = counts.get("x");          // get returns null -> NPE on intValue()
```

Use `counts.getOrDefault("x", 0)`, or keep the type as `Integer` and check it. The same happens with `Boolean` fields from JSON/DB in `if (user.getActive())`. Use `Boolean.TRUE.equals(user.getActive())`.

## Cause 4: Spring/DI didn't inject the field

`@Autowired` fields are `null` when:

- you created the object yourself with `new MyService()` instead of letting Spring create it;
- the class isn't a bean (`@Component`/`@Service` missing, or outside the component-scan package);
- you use the field in a constructor (field injection happens after construction).

Prefer constructor injection, which fails at startup instead of with an NPE later:

```java
@Service
class OrderService {
    private final PaymentClient client;
    OrderService(PaymentClient client) { this.client = client; }
}
```

## Cause 5: string comparisons and equals on a null

`status.equals("ACTIVE")` throws if `status` is null. Put the constant first or use `Objects.equals`:

```java
"ACTIVE".equals(status);
Objects.equals(a, b);
```

`switch` on a null `String` or enum also throws an NPE.

## Cause 6: arrays and collections containing null

`new String[10]` holds ten `null`s until you fill it. `List.of(...)` and `Map.of(...)` reject nulls with an NPE at creation, and `ConcurrentHashMap` rejects null keys/values.

## Prevent it

- Validate inputs early: `this.name = Objects.requireNonNull(name, "name");`
- Return empty collections or `Optional` instead of `null`.
- Use nullness annotations (`@Nullable`, `@NonNull`) with IntelliJ inspections, Error Prone/NullAway or SpotBugs to catch NPEs at compile time.
