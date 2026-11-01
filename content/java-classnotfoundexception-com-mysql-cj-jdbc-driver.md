---
error: "java.lang.ClassNotFoundException: com.mysql.cj.jdbc.Driver"
error_full: |
  java.lang.ClassNotFoundException: com.mysql.cj.jdbc.Driver
  	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
  	at java.base/java.lang.Class.forName0(Native Method)
  	at java.base/java.lang.Class.forName(Class.java:375)
  java.sql.SQLException: No suitable driver found for jdbc:mysql://localhost:3306/mydb
cat: java
description: The MySQL JDBC driver (Connector/J) isn't on the runtime classpath. It's missing from your build file, has the wrong scope, isn't packaged in the JAR/WAR, or isn't in the app server's lib folder.
tldr: "Add Connector/J: Maven `com.mysql:mysql-connector-j` (runtime scope), Gradle `runtimeOnly 'com.mysql:mysql-connector-j:<version>'`. Without a build tool: `java -cp .:mysql-connector-j-<version>.jar Main` (`;` on Windows). For Tomcat copy the JAR into `$CATALINA_HOME/lib` or `WEB-INF/lib`. Use `com.mysql.cj.jdbc.Driver`, not the old `com.mysql.jdbc.Driver`."
keywords: java classnotfoundexception com.mysql.cj.jdbc.driver mysql connector j jdbc no suitable driver found for jdbc:mysql maven gradle dependency classpath tomcat spring boot com.mysql.jdbc.driver
related: [java-could-not-find-or-load-main-class, db-mysql-access-denied-for-user-root-localhost, java-unsupportedclassversionerror]
---
## What it means

`Class.forName("com.mysql.cj.jdbc.Driver")` (or a framework doing the same) asked the class loader for the driver class, and no JAR on the classpath contains it. Without `Class.forName`, the same root cause shows up as `SQLException: No suitable driver found for jdbc:mysql://...`, because `DriverManager` found no registered driver for that URL.

The driver is a separate library, MySQL Connector/J. It is not part of the JDK.

## Fix 1: Maven

Use the current artifact coordinates (`com.mysql:mysql-connector-j`; the old `mysql:mysql-connector-java` was relocated after 8.0.31):

```xml
<dependency>
  <groupId>com.mysql</groupId>
  <artifactId>mysql-connector-j</artifactId>
  <version>8.4.0</version>
  <scope>runtime</scope>
</dependency>
```

Spring Boot manages the version, so you can omit `<version>`. Then reload the project in your IDE (IntelliJ: Maven tool window -> Reload) and rebuild.

Don't use `<scope>provided</scope>` or `test` unless the server really supplies it; those scopes leave the JAR out of the packaged app.

## Fix 2: Gradle

```groovy
dependencies {
    runtimeOnly 'com.mysql:mysql-connector-j:8.4.0'
}
```

Kotlin DSL: `runtimeOnly("com.mysql:mysql-connector-j:8.4.0")`. If you call driver classes directly in code, use `implementation` instead.

## Fix 3: plain `java` / no build tool

Download the platform-independent JAR from dev.mysql.com (Connector/J) and put it on the classpath at run time, not just compile time:

```bash
javac Main.java
java -cp .:lib/mysql-connector-j-8.4.0.jar Main        # Linux/macOS
java -cp ".;lib\mysql-connector-j-8.4.0.jar" Main      # Windows
```

Note `java -jar app.jar` **ignores** `-cp`. Either build a fat JAR that includes the driver (Maven Shade/Assembly plugin, Spring Boot's plugin, Gradle Shadow), or add a `Class-Path:` entry to the manifest.

In an IDE without Maven/Gradle, add the JAR as a library (IntelliJ: File -> Project Structure -> Modules -> Dependencies -> + JARs; Eclipse: Build Path -> Add External Archives).

## Fix 4: Tomcat and other servlet containers

If a Tomcat-managed DataSource (a `<Resource>` in `context.xml`) uses the driver, the JAR must be in `$CATALINA_HOME/lib`, because Tomcat creates the pool outside your web app. If only your app code uses it, `WEB-INF/lib` inside the WAR is enough. Restart Tomcat after copying.

## Fix 5: wrong or outdated class name

- Connector/J 8+: `com.mysql.cj.jdbc.Driver`
- Connector/J 5.x (very old): `com.mysql.jdbc.Driver`

With an 8.x JAR, the old name still works but logs a deprecation warning. With a 5.x JAR, `com.mysql.cj.jdbc.Driver` doesn't exist. Since JDBC 4, `Class.forName(...)` isn't needed at all; the driver registers itself when the JAR is on the classpath:

```java
try (Connection c = DriverManager.getConnection(
        "jdbc:mysql://localhost:3306/mydb", "app", "secret")) {
    ...
}
```

In Spring Boot, `spring.datasource.driver-class-name` can usually be removed; it's inferred from the URL.

## Check what's on the classpath

```bash
mvn dependency:tree | grep -i mysql
./gradlew dependencies --configuration runtimeClasspath | grep -i mysql
unzip -l target/app.jar | grep -i mysql-connector
```
