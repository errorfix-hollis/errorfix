---
error: "Error: Could not find or load main class org.gradle.wrapper.GradleWrapperMain"
error_full: |
  Error: Could not find or load main class org.gradle.wrapper.GradleWrapperMain
  Caused by: java.lang.ClassNotFoundException: org.gradle.wrapper.GradleWrapperMain
cat: java
description: "The ./gradlew script can't find gradle/wrapper/gradle-wrapper.jar, usually because the jar was never committed (ignored by .gitignore), was deleted, or is corrupted, or the script is run from the wrong directory."
tldr: "Restore `gradle/wrapper/gradle-wrapper.jar`: if Gradle is installed run `gradle wrapper` in the project root (optionally `--gradle-version 8.10`), or copy the jar from another project. Make sure `.gitignore` doesn't exclude it (`!gradle/wrapper/gradle-wrapper.jar`) and commit it."
keywords: java could not find or load main class org.gradle.wrapper.gradlewrappermain gradlew gradle-wrapper.jar missing gitignore classnotfoundexception android studio github actions
related: [java-could-not-find-or-load-main-class, java-gradle-could-not-resolve-all-dependencies, java-home-is-not-set]
---
## What it means

`./gradlew` (or `gradlew.bat`) is a small script that starts Java with `-classpath gradle/wrapper/gradle-wrapper.jar` and the main class `org.gradle.wrapper.GradleWrapperMain`. That class lives only in the jar. If Java can't open the jar at that path, it reports the main class as missing.

A working project has these wrapper files, all of which must be committed:

```
gradlew
gradlew.bat
gradle/wrapper/gradle-wrapper.jar
gradle/wrapper/gradle-wrapper.properties
```

Check quickly:

```bash
ls -l gradle/wrapper/
unzip -l gradle/wrapper/gradle-wrapper.jar | grep GradleWrapperMain
```

## Cause 1: the jar is missing (not committed)

The most common cause: a `.gitignore` with `*.jar` excluded `gradle-wrapper.jar`, so a fresh clone or CI checkout doesn't have it.

## Fix 1: regenerate the wrapper and commit it

With any Gradle installed (`sdk install gradle`, `brew install gradle`, or your IDE's bundled one):

```bash
cd /path/to/project
gradle wrapper --gradle-version 8.10
```

Use the version from `distributionUrl` in `gradle/wrapper/gradle-wrapper.properties` if you want to keep the same one. If running `gradle` fails because the build script itself is broken, generate the wrapper in an empty temp directory and copy `gradle/wrapper/gradle-wrapper.jar` over.

Then un-ignore and commit it:

```gitignore
*.jar
!gradle/wrapper/gradle-wrapper.jar
```

```bash
git add -f gradle/wrapper/gradle-wrapper.jar
git commit -m "Add Gradle wrapper jar"
```

## Cause 2: corrupted jar

The jar exists but is 0 bytes, an HTML error page, or a Git LFS pointer file (`version https://git-lfs.github.com/spec/v1`). Check with `file gradle/wrapper/gradle-wrapper.jar`; it should say "Java archive data" or "Zip archive data".

## Fix 2: replace the jar

Regenerate it as in Fix 1. If the repo uses LFS for `*.jar`, run `git lfs pull`, or exclude the wrapper jar from LFS in `.gitattributes`.

## Cause 3: running gradlew from another directory

The script resolves the jar relative to its own location, but a copied or symlinked `gradlew`, or a broken `APP_HOME` detection in a very old script, can point elsewhere. Run it from the project root:

```bash
cd project-root && ./gradlew build
```

## Cause 4: the gradlew script itself is broken

Line endings matter: a `gradlew` checked out with CRLF line endings on Linux/macOS fails (often with `/usr/bin/env: 'sh\r'`), and a manually edited `CLASSPATH` line can point at the wrong path. Regenerating with `gradle wrapper` fixes both. Add `gradlew text eol=lf` to `.gitattributes`, and make it executable:

```bash
git update-index --chmod=+x gradlew
```

## In CI (GitHub Actions)

The checkout only contains what's committed, so Fix 1 is required. `gradle/actions/setup-gradle` can also run builds with a specific Gradle version without the wrapper, but committing the wrapper jar is the standard approach.
