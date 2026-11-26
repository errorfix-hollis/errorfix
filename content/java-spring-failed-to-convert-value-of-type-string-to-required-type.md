---
error: "Failed to convert value of type 'java.lang.String' to required type"
error_full: |
  Resolved [org.springframework.web.method.annotation.MethodArgumentTypeMismatchException: Failed to convert value of type 'java.lang.String' to required type 'java.lang.Long'; For input string: "undefined"]
  Failed to convert value of type 'java.lang.String' to required type 'java.time.LocalDate'; Failed to convert from type [java.lang.String] to type [@org.springframework.web.bind.annotation.RequestParam java.time.LocalDate] for value '2024-13-01'
cat: java
description: "Spring MVC couldn't convert a request parameter, path variable or header from its string form to the Java type of your controller parameter, for example \"abc\" or \"undefined\" to Long, or a date string in the wrong format to LocalDate. It returns 400 Bad Request."
tldr: "Check the actual value in the log (`For input string: \"undefined\"` usually means the frontend sent a missing id). Fix the client, or adapt the controller: use the right type, `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)` for dates, `@RequestParam(required = false)` for optional values, or a custom `Converter<String, T>` for your own types."
keywords: spring boot failed to convert value of type java.lang.string to required type long integer localdate methodargumenttypemismatchexception requestparam pathvariable datetimeformat enum converter 400 bad request
related: [java-numberformatexception-for-input-string, java-spring-request-method-post-not-supported, java-spring-whitelabel-error-page]
---
## What it means

Request parameters, path variables and headers always arrive as strings. Spring converts them to your method parameter types with its `ConversionService`. When that fails it throws `MethodArgumentTypeMismatchException` (a `TypeMismatchException`) and, by default, responds with **400 Bad Request**. The end of the message shows the offending value.

```java
@GetMapping("/users/{id}")
public User get(@PathVariable Long id) { ... }
// GET /users/undefined -> Failed to convert value of type 'java.lang.String' to required type 'java.lang.Long'
```

## Cause 1: the client sent a bad value

`For input string: "undefined"` or `"null"` is almost always a frontend bug: a template like `` `/users/${user.id}` `` where `user.id` wasn't set yet. Check the request URL in the browser's Network tab and fix the caller. Don't make the server accept "undefined".

## Cause 2: path conflict — the wrong handler matched

```java
@GetMapping("/users/{id}")     // Long id
@GetMapping("/users/search")   // missing or with typo
```

`GET /users/serch` matches `{id}` and fails conversion. Make sure the literal mapping exists, or restrict the variable with a regex: `@GetMapping("/users/{id:\\d+}")`.

## Cause 3: date/time formats

`LocalDate`, `LocalDateTime` and `Date` don't convert from arbitrary strings.

## Fix 3: declare the format

```java
@GetMapping("/orders")
public List<Order> list(
    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
    @RequestParam @DateTimeFormat(pattern = "dd.MM.yyyy") LocalDate to) { ... }
```

Or set it globally in `application.properties`:

```properties
spring.mvc.format.date=yyyy-MM-dd
spring.mvc.format.date-time=yyyy-MM-dd HH:mm:ss
```

Note these settings affect query/path/form values; JSON bodies are handled by Jackson (`@JsonFormat`), which fails with a different `HttpMessageNotReadableException`.

## Cause 4: enum value doesn't match

`?status=active` for `enum Status { ACTIVE, INACTIVE }` fails because the default conversion is case-sensitive and uses `Enum.valueOf`. Send `ACTIVE`, or register a converter:

```java
@Component
public class StatusConverter implements Converter<String, Status> {
    @Override
    public Status convert(String source) {
        return Status.valueOf(source.trim().toUpperCase());
    }
}
```

Spring Boot picks up `Converter` beans automatically.

## Cause 5: empty values for primitives

`?page=` with `int page` fails. Use a wrapper type with a default:

```java
@RequestParam(defaultValue = "0") int page
@RequestParam(required = false) Integer limit
```

## Cause 6: converting to your own class

`@RequestParam UserFilter filter` or `@PathVariable User user` has no converter. Either bind query params to an object without `@RequestParam` (`public List<User> list(UserFilter filter)` — Spring binds fields by name), or implement `Converter<String, User>`.

## Return a cleaner error

```java
@RestControllerAdvice
class ApiErrors {
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<Map<String, String>> typeMismatch(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.badRequest().body(Map.of(
            "error", "Invalid value '" + e.getValue() + "' for parameter '" + e.getName() + "'"));
    }
}
```
