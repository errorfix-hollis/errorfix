---
error: "Whitelabel Error Page"
error_full: |
  Whitelabel Error Page
  This application has no explicit mapping for /error, so you are seeing this as a fallback.

  Sat Nov 21 10:15:42 UTC 2026
  There was an unexpected error (type=Not Found, status=404).
cat: java
description: "Spring Boot's default error view. It means a request failed (most often 404 because no controller handles the URL, or 500 from an exception) and you have no custom error page. The status line tells you which."
tldr: "Read `status=` on the page. For 404, check that your controller is in the main class's package or a subpackage, uses `@RestController` (or `@Controller` with a real template), and that the URL and HTTP method match the mapping. For 500, look at the stack trace in the console log. Add `src/main/resources/templates/error.html` or `server.error.whitelabel.enabled=false` to replace the page."
keywords: spring boot whitelabel error page this application has no explicit mapping for /error 404 not found 500 internal server error controller component scan restcontroller thymeleaf template static index.html
related: [java-spring-field-required-a-bean-of-type-that-could-not-be-found, java-spring-port-8080-was-already-in-use, java-failed-to-load-applicationcontext]
---
## What it means

When a request fails, Spring Boot forwards it to `/error`. If you haven't defined a view for that, `ErrorMvcAutoConfiguration` renders this "whitelabel" HTML page. The page itself is not the bug; the line `type=..., status=...` is. Turn on more detail while developing:

```properties
server.error.include-message=always
server.error.include-stacktrace=on_param
```

With `on_param`, add `?trace=true` to the URL to see the stack trace.

## Cause 1 (404): controller not picked up by component scanning

`@SpringBootApplication` scans only its own package and subpackages. A controller in a sibling package is never registered:

```
com.example.demo.DemoApplication      <- scans com.example.demo.**
com.example.controller.HelloController <- NOT scanned
```

Move controllers under `com.example.demo` (e.g. `com.example.demo.web`), or widen the scan:

```java
@SpringBootApplication(scanBasePackages = "com.example")
public class DemoApplication { ... }
```

Check the startup log with `logging.level.org.springframework.web=DEBUG`: registered mappings are listed.

## Cause 2 (404): URL, method or context path doesn't match

```java
@RestController
@RequestMapping("/api")
public class HelloController {
    @GetMapping("/hello")
    public String hello() { return "hi"; }
}
```

This answers `GET /api/hello` only. `/hello` gives 404; a `POST` gives 405. If `server.servlet.context-path=/app` is set, the URL becomes `/app/api/hello`.

## Cause 3 (404 or 500): `@Controller` returning a view that doesn't exist

With `@Controller`, a returned string is a **template name**:

```java
@Controller
public class HomeController {
    @GetMapping("/")
    public String home() { return "index"; }   // needs templates/index.html
}
```

Without a template engine dependency (`spring-boot-starter-thymeleaf`) or without `src/main/resources/templates/index.html`, it fails. If you meant to return text or JSON, use `@RestController` or add `@ResponseBody`.

## Cause 4 (404 on `/`): no home page

A new project has no mapping for `/`. Add a controller, or put a static file at `src/main/resources/static/index.html`, which Spring Boot serves automatically.

## Cause 5 (500): an exception in your code

`status=500` means a controller or service threw. The stack trace is in the application log (console), not on the page. Fix the exception, or handle it and return a proper status:

```java
@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> notFound(NoSuchElementException e) {
        return Map.of("error", e.getMessage());
    }
}
```

## Cause 6 (403/401): Spring Security

With `spring-boot-starter-security` on the classpath, unauthenticated requests are redirected to `/login` or rejected, and a 403 can surface as this page (CSRF blocks `POST` by default). Configure a `SecurityFilterChain` that permits your routes.

## Replace the page

Add a custom template (`src/main/resources/templates/error.html`, or `templates/error/404.html` for specific codes; static `static/error/404.html` works without a template engine), or disable it so the servlet container's default page is used:

```properties
server.error.whitelabel.enabled=false
```
