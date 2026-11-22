---
error: "Request method 'POST' is not supported"
error_full: |
  WARN 12345 --- [nio-8080-exec-1] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.web.HttpRequestMethodNotSupportedException: Request method 'POST' is not supported]
  {"timestamp":"2026-11-22T10:15:30.000+00:00","status":405,"error":"Method Not Allowed","path":"/api/users"}
cat: java
description: "Spring found a handler for the URL but not for that HTTP method, so it returned 405 Method Not Allowed. The mapping uses a different method, the path doesn't match, or the request was redirected/forwarded (often by Spring Security or a form)."
tldr: "Make the controller method match the request: `@PostMapping(\"/api/users\")` for POST (check `@RequestMapping` on the class for a path prefix). Check the `Allow` response header to see what is supported. If a POST works only after login or ends at /error, look at Spring Security (CSRF) and redirects."
keywords: spring boot request method post is not supported get not supported httprequestmethodnotsupportedexception 405 method not allowed postmapping getmapping requestmapping csrf spring security form
related: [java-spring-whitelabel-error-page, java-spring-field-required-a-bean-of-type-that-could-not-be-found, web-cors-no-access-control-allow-origin]
---
## What it means

`HttpRequestMethodNotSupportedException` is thrown when a request URL matches at least one handler mapping, but none accepts the request's method. Spring answers `405 Method Not Allowed` and lists the allowed methods in the `Allow` header:

```bash
curl -i -X POST http://localhost:8080/api/users
# HTTP/1.1 405
# Allow: GET
```

The method in the message varies: `'GET' is not supported` is equally common.

## Cause 1: the mapping uses another method

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping           // only GET /api/users
    public List<User> list() { ... }

    @PostMapping          // add this for POST /api/users
    public User create(@RequestBody User user) { ... }
}
```

`@RequestMapping` without `method` accepts all methods; `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping` accept one each.

## Cause 2: the path only matches another endpoint

A POST to `/api/users/42` may match `@GetMapping("/{id}")` but no POST mapping, giving 405 instead of 404. Check the full path including the class-level `@RequestMapping` prefix and `server.servlet.context-path`. Trailing slashes: since Spring Boot 3 (Spring 6), `/api/users/` no longer matches `/api/users`.

## Cause 3: Spring Security / CSRF turns it into a forward or redirect

With Spring Security, a POST without a CSRF token is rejected (403). Errors are forwarded to `/error`, and redirects (e.g. to `/login`) make the browser follow with GET. Either can surface as a confusing 405 on another URL.

For a stateless REST API using tokens:

```java
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(a -> a.anyRequest().authenticated())
        .httpBasic(Customizer.withDefaults());
    return http.build();
}
```

Keep CSRF on for browser sessions with form login, and include the token in forms (Thymeleaf adds it automatically with `th:action`).

## Cause 4: HTML form or client sends the wrong method

- HTML forms only send GET and POST. To send PUT/DELETE, add a hidden `_method` field and enable `spring.mvc.hiddenmethod.filter.enabled=true`.
- A `<form>` without `method="post"` sends GET.
- In JavaScript, `fetch(url, { method: "POST", ... })`; the default is GET.

## Cause 5: browser preflight (CORS)

A cross-origin request with JSON first sends `OPTIONS`. If CORS isn't configured, the preflight fails and the browser reports a CORS error. Configure `@CrossOrigin` or a `CorsConfigurationSource`; see the CORS page.

## Debugging

Turn on mapping logs to see exactly which handlers are registered:

```properties
logging.level.org.springframework.web=DEBUG
```

Spring logs `Mapped to ...` per request and lists all mappings at startup. Look up status codes in the [HTTP status codes reference](/tools/http-status-codes/).
