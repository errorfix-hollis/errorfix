---
error: "Could not resolve all dependencies for configuration"
error_full: |
  FAILURE: Build failed with an exception.

  * What went wrong:
  Execution failed for task ':app:compileJava'.
  > Could not resolve all dependencies for configuration ':app:compileClasspath'.
     > Could not find com.example:library:1.2.3.
       Required by:
           project :app
cat: java
description: Gradle could not download or locate one or more dependencies for a configuration. The artifact or version does not exist in the declared repositories, the repository is missing, or the network/proxy/auth blocks access.
tldr: "Read the nested `Could not find`/`Could not GET` line. Check the coordinates and version exist, add the right repository (`mavenCentral()`, `google()`) in `settings.gradle` / `build.gradle`, then run `./gradlew build --refresh-dependencies`. Behind a proxy set `systemProp.https.proxyHost`/`proxyPort` in `gradle.properties`."
keywords: gradle could not resolve all dependencies for configuration compileClasspath runtimeClasspath could not find could not get refresh-dependencies mavenCentral google repository android proxy offline
related: [java-classnotfoundexception-com-mysql-cj-jdbc-driver, java-home-is-not-set, java-unsupportedclassversionerror]
---
## What it means

Before compiling, Gradle resolves every dependency in a configuration (`compileClasspath`, `runtimeClasspath`, `debugRuntimeClasspath`…). If any one fails, the whole configuration fails with this message. The real reason is in the indented lines below it — look for one of:

- `Could not find group:name:version` — no repository has that artifact.
- `Could not GET 'https://...'` / `Connection refused` / `PKIX path building failed` — network, proxy or TLS problem.
- `Received status code 401/403` — authentication to a private repository.
- `No matching variant` — artifact exists but is incompatible (Java version, Android vs JVM).

Get more detail with:

```bash
./gradlew build --stacktrace --info
./gradlew :app:dependencies --configuration compileClasspath
```

## Fix 1: wrong coordinates or version

Check the artifact really exists on [search.maven.org](https://search.maven.org) or the vendor's repository. Typos in the group, artifact name or version are common, as are versions that were never published.

```groovy
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
}
```

## Fix 2: missing repository

Gradle only looks in repositories you declare. Android libraries live in `google()`; most others in `mavenCentral()`. JCenter is shut down — remove `jcenter()` and find the library elsewhere.

In modern projects repositories are in `settings.gradle(.kts)`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") } // only if needed
    }
}
```

If `repositoriesMode` is `FAIL_ON_PROJECT_REPOS`, repositories declared in a module's `build.gradle` are ignored/rejected — add them here instead.

## Fix 3: stale or corrupt cache

A failed download can be cached. Force Gradle to re-check:

```bash
./gradlew build --refresh-dependencies
```

If that does not help, stop daemons and remove the cached module:

```bash
./gradlew --stop
rm -rf ~/.gradle/caches/modules-2/files-2.1/com.example
```

Also make sure you are not in offline mode (`--offline`, or the Offline toggle in Android Studio / IntelliJ's Gradle panel).

## Fix 4: proxy, firewall or TLS

Corporate networks often need a proxy. Add to `~/.gradle/gradle.properties`:

```properties
systemProp.http.proxyHost=proxy.example.com
systemProp.http.proxyPort=8080
systemProp.https.proxyHost=proxy.example.com
systemProp.https.proxyPort=8080
systemProp.http.nonProxyHosts=localhost|*.internal
```

`PKIX path building failed` means a TLS-inspecting proxy's certificate isn't trusted by the JDK running Gradle. Import it into that JDK's truststore:

```bash
keytool -importcert -alias corp -file corp.crt -cacerts -storepass changeit
```

## Fix 5: private repository credentials (401/403)

```kotlin
maven {
    url = uri("https://maven.pkg.github.com/OWNER/REPO")
    credentials {
        username = providers.gradleProperty("gpr.user").get()
        password = providers.gradleProperty("gpr.key").get()
    }
}
```

Put `gpr.user` and `gpr.key` in `~/.gradle/gradle.properties`, not in the repo. GitHub Packages requires a token even for public packages.

## Fix 6: variant / Java version mismatch

`No matching variant ... compatible with Java 8` means the library needs a newer JVM. Raise the toolchain:

```kotlin
java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }
```

Or choose an older library version that supports your Java version.
