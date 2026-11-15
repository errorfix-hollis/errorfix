---
error: "java.lang.ClassCastException: class X cannot be cast to class Y"
error_full: |
  Exception in thread "main" java.lang.ClassCastException: class java.lang.Integer cannot be cast to class java.lang.String (java.lang.Integer and java.lang.String are in module java.base of loader 'bootstrap')
  	at com.example.App.main(App.java:14)

  java.lang.ClassCastException: class java.util.LinkedHashMap cannot be cast to class com.example.User (java.util.LinkedHashMap is in module java.base of loader 'bootstrap'; com.example.User is in unnamed module of loader 'app')
cat: java
description: "A cast (explicit, or one inserted by generics) found an object of a different runtime type. Common sources are raw or unchecked collections, JSON deserialized into LinkedHashMap, and the same class loaded by two class loaders."
tldr: "Read the two class names: the object really is X. Fix where it was created instead of casting: use typed generics (no raw `List`/`Map`), convert values (`String.valueOf(n)`, not `(String) obj`), deserialize JSON with a concrete type or `TypeReference`, and check `instanceof` before casting. If X and Y have the same name, two class loaders loaded the class: remove the duplicate jar."
keywords: java classcastexception cannot be cast to class linkedhashmap cannot be cast jackson typereference generics raw type instanceof pattern matching class loader integer cannot be cast to string
related: [java-nullpointerexception, java-noclassdeffounderror, java-concurrentmodificationexception]
---
## What it means

A cast `(Y) obj` checks the object's runtime class. If the object isn't a `Y` (or a subclass), the JVM throws `ClassCastException`. Casts don't convert values: `(String) someInteger` never turns `42` into `"42"`.

The message tells you the real type (`class X`) and the target (`class Y`). The text in parentheses shows each class's module and class loader. It matters in Cause 4.

The failing line may contain no visible cast. With generics, the compiler inserts the cast where you *read* the value, so the bug is wherever the wrong object was *put in*.

## Cause 1: casting instead of converting

```java
Object v = map.get("age");      // an Integer
String s = (String) v;          // ClassCastException

String s = String.valueOf(v);           // "42"
int age = ((Number) v).intValue();      // works for Integer, Long, Double...
long id = Long.parseLong(text);         // String -> number
```

`Integer cannot be cast to Long` is a classic one: JSON parsers and JDBC return `Integer` for small numbers. Cast to `Number` and call `.longValue()`.

## Cause 2: raw types and unchecked collections

```java
List list = new ArrayList();      // raw type
list.add(42);
List<String> names = list;        // unchecked warning only
String first = names.get(0);      // ClassCastException here, far from the bug
```

Always use parameterized types (`List<String>`), and treat `unchecked` compiler warnings as errors (`-Xlint:unchecked -Werror`). For collections passed to old code, `Collections.checkedList(list, String.class)` makes the bad `add` fail immediately.

## Cause 3: JSON deserialized into `LinkedHashMap`

Jackson and Gson don't know the element type of a generic collection at runtime, so they build maps:

```java
List<User> users = mapper.readValue(json, List.class);
User u = users.get(0);   // LinkedHashMap cannot be cast to class User
```

Give the full type:

```java
List<User> users = mapper.readValue(json, new TypeReference<List<User>>() {});
// Gson
List<User> users = gson.fromJson(json, new TypeToken<List<User>>(){}.getType());
// already have a Map? convert it
User u = mapper.convertValue(map, User.class);
```

The same applies to Spring `RestTemplate` (use `ParameterizedTypeReference` with `exchange`) and to Redis or cache serializers that store type-less JSON.

## Cause 4: same class name, different class loaders

```
class com.example.User cannot be cast to class com.example.User
(com.example.User is in unnamed module of loader 'app';
 com.example.User is in unnamed module of loader org.springframework.boot.devtools.restart.classloader.RestartClassLoader @1a2b3c)
```

Two copies of the class were loaded by different loaders. The JVM treats them as unrelated types. Typical causes:

- **Spring Boot DevTools:** objects cached or deserialized by a library on the base class loader. Remove DevTools to confirm, or add the library to `META-INF/spring-devtools.properties` with `restart.include`.
- **App servers (Tomcat, WildFly):** the same jar exists in both `WEB-INF/lib` and the server's `lib`. Keep one copy. Mark container-provided APIs (servlet, JPA) as `provided` scope.
- **Plugin systems / OSGi:** share interfaces through a common parent loader.

## Cause 5: wrong subclass assumption

```java
Animal a = repo.find(id);     // actually returns a Cat
Dog d = (Dog) a;              // ClassCastException
```

Check first. Java 16+ pattern matching makes it compact:

```java
if (a instanceof Dog d) {
    d.bark();
}
```

Hibernate lazy proxies are a special case: a proxy of `Animal` can't be cast to `Dog` even when the row is a dog. Use `Hibernate.unproxy(a)` before checking the type, or fetch with the concrete type.

## Cause 6: arrays

`(String[]) list.toArray()` fails because `toArray()` returns `Object[]`. Use `list.toArray(new String[0])` or `list.toArray(String[]::new)` (Java 11+).
