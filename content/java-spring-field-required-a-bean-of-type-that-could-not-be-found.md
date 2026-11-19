---
error: "Field required a bean of type that could not be found."
error_full: |
  ***************************
  APPLICATION FAILED TO START
  ***************************

  Description:

  Field userRepository in com.example.demo.service.UserService required a bean of type 'com.example.demo.repo.UserRepository' that could not be found.

  The injection point has the following annotations:
  	- @org.springframework.beans.factory.annotation.Autowired(required=true)

  Action:

  Consider defining a bean of type 'com.example.demo.repo.UserRepository' in your configuration.
cat: java
description: "Spring tried to inject a dependency but no bean of that type exists in the application context. Usually the class is outside the component-scan package, is missing a stereotype annotation, or its auto-configuration didn't activate."
tldr: "Make sure the class is annotated (`@Service`, `@Component`, `@Repository`, or extends `JpaRepository`) and lives in the same package as your `@SpringBootApplication` class or a sub-package. Otherwise add `@ComponentScan`/`@EnableJpaRepositories(basePackages = \"...\")`, or declare it with a `@Bean` method."
keywords: spring boot field required a bean of type that could not be found consider defining a bean autowired application failed to start component scan repository jpa nosuchbeandefinitionexception
related: [java-failed-to-load-applicationcontext, java-spring-failed-to-configure-a-datasource, java-spring-port-8080-was-already-in-use]
---
## What it means

At startup Spring builds the *application context*: it scans packages for annotated classes and creates beans. When it reaches an `@Autowired` field (or constructor parameter) whose type has no matching bean, startup fails with this message. Under the hood it's a `NoSuchBeanDefinitionException`.

The type named in the message is the one that's missing — not the class that asks for it.

## Cause 1: the class is outside the scanned packages

`@SpringBootApplication` scans only its own package and sub-packages:

```text
com.example.demo.DemoApplication        <- @SpringBootApplication
com.example.demo.service.UserService    <- scanned
com.example.repo.UserRepository         <- NOT scanned (sibling package)
```

**Fix:** move the main class up to the root package (best), or widen the scan:

```java
@SpringBootApplication(scanBasePackages = "com.example")
public class DemoApplication { ... }
```

For Spring Data repositories and JPA entities in other packages you also need:

```java
@EnableJpaRepositories(basePackages = "com.example.repo")
@EntityScan(basePackages = "com.example.model")
```

## Cause 2: missing annotation

A plain class is not a bean. Add a stereotype annotation:

```java
@Service                       // or @Component / @Repository / @Controller
public class EmailSender { ... }
```

Repositories must be interfaces extending a Spring Data type:

```java
public interface UserRepository extends JpaRepository<User, Long> { }
```

Also check you imported the Spring annotation (`org.springframework.stereotype.Service`), not a same-named one from another library.

## Cause 3: third-party class with no bean definition

Classes from libraries (`RestTemplate`, `ObjectMapper` in some setups, `ModelMapper`, an SDK client) are not beans unless something defines them:

```java
@Configuration
public class AppConfig {
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder.build();
    }
}
```

## Cause 4: the starter / auto-configuration isn't active

Spring Data repositories need `spring-boot-starter-data-jpa` (or `-data-mongodb`, etc.) on the classpath. If the dependency is missing, or the auto-configuration is excluded (`exclude = DataSourceAutoConfiguration.class`), no repository beans are created. Check the conditions report:

```bash
./mvnw spring-boot:run -Dspring-boot.run.arguments=--debug
# or
java -jar app.jar --debug
```

Look under "Negative matches" for the auto-configuration you expected.

## Cause 5: conditional or profile-specific beans

A bean annotated `@Profile("prod")` or `@ConditionalOnProperty(...)` doesn't exist when that profile/property isn't set. Activate it (`--spring.profiles.active=prod`) or provide a default implementation.

## Cause 6: in tests, a slice doesn't load the bean

`@WebMvcTest` and `@DataJpaTest` load only part of the context. A service your controller needs won't be there — mock it:

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @MockitoBean   // Spring Boot 3.4+; older versions: @MockBean
    UserService userService;
}
```

## Prefer constructor injection

It makes missing dependencies obvious and testable:

```java
@Service
public class UserService {
    private final UserRepository repo;
    public UserService(UserRepository repo) { this.repo = repo; }
}
```

The error text then reads "Parameter 0 of constructor in ... required a bean of type ..." — same causes, same fixes.
