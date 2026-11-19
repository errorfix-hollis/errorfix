---
error: "MismatchedInputException: Cannot deserialize value of type from Array value (token JsonToken.START_ARRAY)"
error_full: |
  com.fasterxml.jackson.databind.exc.MismatchedInputException: Cannot deserialize value of type `com.example.User` from Array value (token `JsonToken.START_ARRAY`)
   at [Source: (String)"[{"id":1,"name":"Ann"}]"; line: 1, column: 1]
cat: java
description: "Jackson found a JSON array `[...]` where your Java type expects a single object `{...}`. The mapping target must be a List/array, or the JSON must be unwrapped first. The reverse case reports `from Object value (token JsonToken.START_OBJECT)`."
tldr: "Deserialize into a collection: `List<User> users = mapper.readValue(json, new TypeReference<List<User>>() {});` (or `User[].class`). With RestTemplate use `getForObject(url, User[].class)`; in Spring controllers take `@RequestBody List<User>`. If the API sometimes sends a single object, enable `DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY`."
keywords: jackson mismatchedinputexception cannot deserialize value of type from array value token jsontoken.start_array start_object typereference list resttemplate spring requestbody objectmapper accept_single_value_as_array unwrap_single_value_arrays
related: [java-classcastexception, java-failed-to-load-applicationcontext, python-jsondecodeerror-expecting-value]
---
## What it means

Jackson reads the JSON token by token. The first token at the reported location is `[` (`START_ARRAY`), but the target type is a POJO, which must start with `{`. The `line`/`column` in the message point to where the mismatch is — `column: 1` means the whole document is an array; a later column means a **field** inside your object is an array.

Paste the payload into the [JSON formatter](/tools/json-formatter/) to see its real shape.

## Cause 1: top-level JSON is a list

```json
[{"id":1,"name":"Ann"},{"id":2,"name":"Bo"}]
```

```java
// Wrong
User user = mapper.readValue(json, User.class);

// Right
List<User> users = mapper.readValue(json, new TypeReference<List<User>>() {});
// or
User[] users = mapper.readValue(json, User[].class);
```

`TypeReference` is needed for generic types because `List<User>.class` doesn't exist (type erasure). Using `List.class` alone gives you `List<LinkedHashMap>` and a later `ClassCastException`.

## Cause 2: RestTemplate / WebClient / Feign response type

```java
// RestTemplate
User[] users = restTemplate.getForObject(url, User[].class);

// or with generics
List<User> users = restTemplate.exchange(url, HttpMethod.GET, null,
        new ParameterizedTypeReference<List<User>>() {}).getBody();

// WebClient
List<User> users = webClient.get().uri(url).retrieve()
        .bodyToFlux(User.class).collectList().block();
```

In Feign, declare the method as returning `List<User>`.

## Cause 3: Spring controller expects one object, client sends a list

```java
@PostMapping("/users")
public void create(@RequestBody List<User> users) { ... }
```

Or fix the client to send `{...}` instead of `[{...}]`. Spring wraps this as `HttpMessageNotReadableException: JSON parse error: Cannot deserialize value of type ...`.

## Cause 4: a field is an array in the JSON but scalar in the class

```json
{"id": 1, "tags": ["a", "b"]}
```

```java
class Post {
    long id;
    String tags;          // wrong: column points here
    List<String> tags;    // right
}
```

## Cause 5: the API wraps or varies its response

If the list is wrapped (`{"data":[...]}`), model the wrapper:

```java
record Page(List<User> data) {}
Page page = mapper.readValue(json, Page.class);
```

Or read the tree and extract: `mapper.readerForListOf(User.class).readValue(mapper.readTree(json).get("data"))`.

If an API returns either one object or an array, accept both:

```java
mapper.enable(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY);   // object -> List
mapper.enable(DeserializationFeature.UNWRAP_SINGLE_VALUE_ARRAYS);     // [x] -> x
```

or per field: `@JsonFormat(with = JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY)`. In Spring Boot, set `spring.jackson.deserialization.accept-single-value-as-array=true`.

## The reverse error

`Cannot deserialize value of type java.util.ArrayList<...> from Object value (token JsonToken.START_OBJECT)` is the mirror case: you asked for a List but the JSON is `{...}` — usually a wrapper object or an error response like `{"error":"..."}`. Log the raw body before parsing.
