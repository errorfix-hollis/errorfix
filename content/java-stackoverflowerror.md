---
error: "Exception in thread \"main\" java.lang.StackOverflowError"
error_full: |
  Exception in thread "main" java.lang.StackOverflowError
  	at com.example.Main.factorial(Main.java:8)
  	at com.example.Main.factorial(Main.java:8)
  	at com.example.Main.factorial(Main.java:8)
  	...
cat: java
description: "A thread's call stack ran out of space, almost always because of infinite or very deep recursion: a missing base case, two methods calling each other, or toString/equals/hashCode/JSON serialization looping over a bidirectional relationship."
tldr: "Look at the repeating lines in the stack trace: they show the recursive method(s). Add or fix the base case, break cycles (e.g. `@JsonIgnore`/`@JsonManagedReference` on JPA bidirectional relations, exclude the back-reference from Lombok `@ToString`/`@EqualsAndHashCode`), or convert deep recursion to a loop. Raising the stack with `-Xss4m` only helps for legitimately deep (finite) recursion."
keywords: java lang stackoverflowerror exception in thread main recursion infinite base case xss stack size jackson infinite recursion jpa bidirectional lombok tostring hashcode spring
related: [java-outofmemoryerror-java-heap-space, java-nullpointerexception, java-failed-to-load-applicationcontext]
---
## What it means

Every method call pushes a frame onto the thread's stack. The stack has a fixed size (typically 512 KB–1 MB per thread on 64-bit JVMs). When calls nest too deeply, the JVM throws `StackOverflowError`. It's an `Error`, not an `Exception` — don't try to catch it as a fix.

The stack trace is the key: it repeats the same one, two or few lines thousands of times. Those lines are the loop.

## Cause 1: recursion without a (reachable) base case

```java
static long factorial(int n) {
    return n * factorial(n - 1);      // never stops
}
```

Fix the base case, and make sure every path moves toward it:

```java
static long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

Common variants: the base case compares with `==` but the value skips over it (`n -= 2` with an odd start), the argument isn't changed (`helper(n)` instead of `helper(n - 1)`), or the input is negative.

## Cause 2: a method that accidentally calls itself

Getters, setters and overrides that refer to themselves:

```java
public String getName() {
    return getName();          // meant: return name;
}

public void setAge(int age) {
    setAge(age);               // meant: this.age = age;
}

@Override
public String toString() {
    return "User " + this;     // "this" calls toString() again
}
```

Constructors that create an instance of their own class (`new Node()` inside `Node()`'s constructor or a field initializer) cause the same thing.

## Cause 3: cycles in toString, equals, hashCode or JSON

Two objects referring to each other, e.g. a JPA `@OneToMany`/`@ManyToOne` pair:

```java
class Order  { @ManyToOne Customer customer; }
class Customer { @OneToMany(mappedBy = "customer") List<Order> orders; }
```

`Customer.toString()` prints orders, each order prints its customer, and so on. Lombok's `@Data` generates exactly this for `toString`, `equals` and `hashCode`. Exclude the back-reference:

```java
@ToString.Exclude
@EqualsAndHashCode.Exclude
@ManyToOne
private Customer customer;
```

With Jackson (Spring REST controllers) the symptom is `Infinite recursion (StackOverflowError)` / `Document nesting depth exceeds`. Break the cycle:

```java
@OneToMany(mappedBy = "customer")
@JsonManagedReference
private List<Order> orders;

@ManyToOne
@JsonBackReference
private Customer customer;
```

or `@JsonIgnore` on one side — better still, return DTOs instead of entities.

## Cause 4: Spring configuration loops

A bean whose method calls itself through a proxy, an `@Async`/AOP advice that triggers itself, or a `WebSecurityConfigurer` that delegates to itself can recurse during startup. The repeating frames will show Spring classes around your method; look for your own class name in the loop.

## Cause 5: recursion that is correct but too deep

Walking a 100,000-node linked list or a deep tree recursively may simply exceed the stack. Prefer an explicit loop or stack:

```java
Deque<Node> stack = new ArrayDeque<>();
stack.push(root);
while (!stack.isEmpty()) {
    Node n = stack.pop();
    // process n
    n.children.forEach(stack::push);
}
```

Or increase the stack size: for the main thread `java -Xss8m -jar app.jar`, for a specific thread `new Thread(null, task, "worker", 64L * 1024 * 1024)`. This only buys depth; it won't fix infinite recursion.
