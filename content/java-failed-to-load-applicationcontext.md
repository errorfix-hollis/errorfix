---
error: "java.lang.IllegalStateException: Failed to load ApplicationContext"
error_full: |
  java.lang.IllegalStateException: Failed to load ApplicationContext for [WebMergedContextConfiguration@1a2b3c testClass = com.example.UserControllerTest, ...]
      at org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate.loadContext(DefaultCacheAwareContextLoaderDelegate.java:180)
  Caused by: org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'userController' ...
cat: java
description: "A Spring test could not start the application context. The real reason is never in this line: scroll to the last 'Caused by:' in the stack trace — usually a missing bean, a database that can't be reached, or a bad property."
tldr: "Scroll to the innermost `Caused by:`. Typical fixes: add a `@MockBean`/`@MockitoBean` for dependencies not loaded by a slice test (`@WebMvcTest`), provide test properties or an in-memory DB (H2/Testcontainers) for DataSource errors, and make sure the test class is in a package under your `@SpringBootApplication` class."
keywords: java spring boot test failed to load applicationcontext illegalstateexception caused by unsatisfieddependencyexception nosuchbeandefinitionexception webmvctest mockbean datasource junit 5 springboottest
related: [java-spring-port-8080-was-already-in-use, java-classnotfoundexception-com-mysql-cj-jdbc-driver, java-noclassdeffounderror]
---
## What it means

The Spring TestContext framework tried to build the application context for your test and something threw during startup. `Failed to load ApplicationContext` is just the wrapper. Every other test sharing the same context also fails with it (Spring caches the failure — newer versions say "ApplicationContext failure threshold (1) exceeded").

**Scroll down to the last `Caused by:`**. In Maven, the full trace is in `target/surefire-reports/*.txt`; in Gradle, run `./gradlew test --info` or open `build/reports/tests`.

## Cause 1: missing bean in a slice test

`@WebMvcTest`, `@DataJpaTest` and other slices load only part of the app. A controller that needs a `UserService` fails with:

```
NoSuchBeanDefinitionException: No qualifying bean of type 'com.example.UserService' available
```

Mock it:

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @MockitoBean            // Spring Boot 3.4+; older: @MockBean
    UserService userService;

    @Autowired MockMvc mvc;
}
```

Or use `@SpringBootTest` if you want the full context.

## Cause 2: database / DataSource can't be configured

```
Failed to configure a DataSource: 'url' attribute is not specified
Connection refused ... Communications link failure
```

Tests start the real datasource config. Options:

- Add H2 as a test dependency so Boot auto-configures an embedded DB:

```xml
<dependency>
  <groupId>com.h2database</groupId>
  <artifactId>h2</artifactId>
  <scope>test</scope>
</dependency>
```

- Use Testcontainers with `@ServiceConnection` for a real Postgres/MySQL.
- Provide `src/test/resources/application.properties` (or a `test` profile with `@ActiveProfiles("test")`) with valid connection settings.

## Cause 3: unresolved property placeholder

```
Could not resolve placeholder 'api.key' in value "${api.key}"
```

The property exists only in an environment variable or a profile that tests don't load. Add it to test properties, or inline it:

```java
@SpringBootTest(properties = "api.key=test")
```

Or give it a default: `@Value("${api.key:}")`.

## Cause 4: test class can't find the configuration

```
Unable to find a @SpringBootConfiguration, you need to use @ContextConfiguration or @SpringBootTest(classes=...)
```

Spring searches **up** the package tree from the test's package. Put tests in the same package (or a sub-package) as the `@SpringBootApplication` class, or point to it: `@SpringBootTest(classes = MyApplication.class)`.

## Cause 5: port already in use

With `@SpringBootTest(webEnvironment = DEFINED_PORT)`, a running app on 8080 makes the test context fail. Use `RANDOM_PORT` instead. See [Port 8080 was already in use](/java/java-spring-port-8080-was-already-in-use/).

## Cause 6: dependency/version mismatch

`NoSuchMethodError`, `ClassNotFoundException` or `NoClassDefFoundError` in the cause chain mean incompatible library versions — e.g. a Spring Boot 2 library on Boot 3 (`javax.*` vs `jakarta.*`). Check with `./mvnw dependency:tree` or `./gradlew dependencies` and let the Spring Boot BOM manage versions instead of pinning them.

## Cause 7: circular dependency

```
The dependencies of some of the beans in the application context form a cycle
```

Since Boot 2.6 cycles are rejected. Break it by moving shared logic to a third bean, or use constructor injection with `@Lazy` on one side.
