---
error: "Web server failed to start. Port 8080 was already in use."
error_full: |
  ***************************
  APPLICATION FAILED TO START
  ***************************

  Description:

  Web server failed to start. Port 8080 was already in use.

  Action:

  Identify and stop the process that's listening on port 8080 or configure this application to listen on another port.
cat: java
description: Spring Boot's embedded Tomcat (or Jetty/Undertow) couldn't bind to port 8080 because another process is already listening there — often a previous run of the same app that never stopped.
tldr: "Find and stop the process: `sudo lsof -i :8080` or `sudo ss -ltnp 'sport = :8080'`, then `kill <PID>` (Windows: `netstat -ano | findstr :8080` then `taskkill /PID <PID> /F`). Or run on another port: `server.port=8081` in application.properties, or `--server.port=8081`."
keywords: spring boot web server failed to start port 8080 was already in use application failed to start tomcat server.port lsof netstat taskkill change port intellij
related: [linux-address-already-in-use, docker-port-is-already-allocated, java-could-not-find-or-load-main-class]
---
## What it means

Only one process can listen on a TCP port at a time. On startup Spring Boot tries to bind its embedded web server to `server.port` (default 8080). The OS refused because something else holds it. Spring prints the friendly message above instead of the underlying `java.net.BindException: Address already in use`.

## Fix 1: find and stop the process

Linux / macOS:

```bash
sudo lsof -i :8080              # shows COMMAND and PID
sudo ss -ltnp 'sport = :8080'   # Linux alternative
kill <PID>                      # then kill -9 <PID> if it ignores it
```

Windows (Command Prompt):

```bat
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

PowerShell: `Get-NetTCPConnection -LocalPort 8080 | Select-Object OwningProcess`.

If it's `java`, it's very likely an earlier run of your app.

## Cause: the previous run is still alive

Common in IDEs: you click Run again instead of Restart, or close the console tab without stopping the app. In IntelliJ IDEA, open the Run/Services tool window and stop old instances; with "Allow multiple instances" unchecked (the default), Rerun replaces the old instance. Apps started with `mvn spring-boot:run` or `./gradlew bootRun` in a terminal are stopped with Ctrl+C — Ctrl+Z only suspends them and keeps the port.

## Fix 2: use a different port

`src/main/resources/application.properties`:

```properties
server.port=8081
```

or `application.yml`:

```yaml
server:
  port: 8081
```

Or override at launch, without changing code:

```bash
java -jar app.jar --server.port=8081
SERVER_PORT=8081 java -jar app.jar
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
```

`server.port=0` picks a random free port (useful for tests and running several instances).

## Cause: another service uses 8080

8080 is a popular default: Jenkins, Tomcat installs, other dev servers, Docker containers with `-p 8080:...`. Check containers:

```bash
docker ps --filter "publish=8080"
```

Stop that service, or move one of them to another port.

## Tests

`@SpringBootTest(webEnvironment = WebEnvironment.DEFINED_PORT)` uses the real port and fails if the app is also running. Prefer `WebEnvironment.RANDOM_PORT` and inject it with `@LocalServerPort`.

## Not a web app?

If the application shouldn't start a web server at all (batch job, CLI), disable it:

```properties
spring.main.web-application-type=none
```
