---
error: "Failed to configure a DataSource: 'url' attribute is not specified and no embedded datasource could be configured."
error_full: |
  ***************************
  APPLICATION FAILED TO START
  ***************************

  Description:

  Failed to configure a DataSource: 'url' attribute is not specified and no embedded datasource could be configured.

  Reason: Failed to determine a suitable driver class

  Action:

  Consider the following:
      If you want an embedded database (H2, HSQL or Derby), please put it on the classpath.
      If you have database settings to be loaded from a particular profile you may need to activate it (no profiles are currently active).
cat: java
description: "Spring Boot found spring-boot-starter-data-jpa or spring-boot-starter-jdbc on the classpath, so it tried to create a DataSource, but there is no spring.datasource.url and no embedded database. Add the connection settings, add H2, or disable DataSource auto-configuration."
tldr: "Add `spring.datasource.url=jdbc:postgresql://localhost:5432/mydb` (plus username, password) to `src/main/resources/application.properties` and include the JDBC driver dependency. If you don't need a database yet, exclude auto-config: `@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)`. If settings are in `application-dev.properties`, activate the profile with `spring.profiles.active=dev`."
keywords: spring boot failed to configure a datasource url attribute is not specified no embedded datasource failed to determine a suitable driver class application failed to start jpa h2 datasourceautoconfiguration
related: [java-failed-to-load-applicationcontext, java-spring-port-8080-was-already-in-use, java-classnotfoundexception-com-mysql-cj-jdbc-driver]
---
## What it means

Spring Boot's auto-configuration creates a `DataSource` bean whenever a JDBC/JPA starter is on the classpath. To build it, it needs either a JDBC URL (`spring.datasource.url`) or an embedded database (H2, HSQLDB, Derby) it can start automatically. It found neither, so startup fails before your code runs.

## Fix 1: add the datasource settings

In `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=myuser
spring.datasource.password=secret
```

MySQL: `jdbc:mysql://localhost:3306/mydb`. Or in `application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: myuser
    password: secret
```

Make sure the JDBC driver is a dependency, otherwise you'll get `Failed to determine a suitable driver class` or `Cannot load driver class`:

```xml
<dependency>
  <groupId>org.postgresql</groupId>
  <artifactId>postgresql</artifactId>
  <scope>runtime</scope>
</dependency>
<!-- MySQL: com.mysql:mysql-connector-j -->
```

## Fix 2: the properties file isn't being read

Common reasons the settings exist but aren't picked up:

- File is not in `src/main/resources` (or `src/test/resources` for tests), or is misnamed (`application.property`, `aplication.properties`).
- In a multi-module project the file is in a different module than the one you run.
- The IDE didn't copy resources; run `mvn clean package` / `./gradlew clean build`, or rebuild the project.
- Property keys use the wrong prefix, e.g. `spring.datasource.uri` or `datasource.url`.

Environment variables work too: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`. In Docker, check they're actually passed to the container.

## Fix 3: the settings are in an inactive profile

The message says `no profiles are currently active`. If the URL is in `application-dev.properties`, activate that profile:

```properties
# application.properties
spring.profiles.active=dev
```

or at runtime: `java -jar app.jar --spring.profiles.active=dev`, or `SPRING_PROFILES_ACTIVE=dev`.

## Fix 4: you want an in-memory database

For prototypes and tests, add H2 and Spring Boot configures it automatically with no URL:

```xml
<dependency>
  <groupId>com.h2database</groupId>
  <artifactId>h2</artifactId>
  <scope>runtime</scope>
</dependency>
```

For tests only, use `@DataJpaTest` (embedded DB by default) or `@AutoConfigureTestDatabase`.

## Fix 5: you don't need a database (yet)

If a JPA starter was added by Spring Initializr but you aren't using it, remove `spring-boot-starter-data-jpa` / `spring-boot-starter-jdbc` from `pom.xml` or `build.gradle`. Or exclude the auto-configuration:

```java
@SpringBootApplication(exclude = { DataSourceAutoConfiguration.class })
public class App { ... }
```

or in properties:

```properties
spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
```

If you also have JPA on the classpath you may need to exclude `HibernateJpaAutoConfiguration` too.

## Check

Run with `--debug` to see the auto-configuration report, which lists why `DataSourceAutoConfiguration` matched and which properties were found.
