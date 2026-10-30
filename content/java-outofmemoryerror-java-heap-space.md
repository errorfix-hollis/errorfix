---
error: "java.lang.OutOfMemoryError: Java heap space"
error_full: |
  Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
  	at java.base/java.util.Arrays.copyOf(Arrays.java:3512)
  	at java.base/java.util.ArrayList.grow(ArrayList.java:237)
cat: java
description: The JVM couldn't allocate an object because the heap is full even after garbage collection. Either the max heap (-Xmx) is too small for the workload, or the program holds on to too much data (a leak or loading everything into memory).
tldr: "Raise the heap: `java -Xmx2g -jar app.jar` (or `-XX:MaxRAMPercentage=75` in containers). For Maven/Gradle builds set `MAVEN_OPTS=-Xmx2g` or `org.gradle.jvmargs=-Xmx2g` in gradle.properties. If memory keeps growing, capture a heap dump with `-XX:+HeapDumpOnOutOfMemoryError` and look for what retains objects."
keywords: java lang outofmemoryerror java heap space xmx xms heap dump heapdumponoutofmemoryerror maxrampercentage gradle jvmargs maven_opts memory leak gc overhead limit exceeded
related: [java-could-not-find-or-load-main-class, java-unsupportedclassversionerror, k8s-oomkilled]
---
## What it means

All Java objects live on the heap, whose maximum size is fixed at startup (`-Xmx`). If not set, it defaults to 1/4 of physical RAM (or of the container limit on container-aware JVMs). When an allocation fails even after a full GC, the JVM throws this error. The stack trace shows *where* the last allocation happened, which isn't necessarily what's using the memory.

Check the effective max heap:

```bash
java -XX:+PrintFlagsFinal -version | grep -i maxheapsize
```

## Fix 1: give the JVM more heap

```bash
java -Xms512m -Xmx2g -jar app.jar
```

Or without editing the command line (picked up by most launchers):

```bash
export JAVA_TOOL_OPTIONS="-Xmx2g"
```

Don't set `-Xmx` larger than the RAM actually available, or the OS/container will kill the process instead.

## Fix 2: containers — size relative to the limit

Hard-coding `-Xmx` in images is fragile. Use a percentage of the container memory limit and leave headroom for metaspace, thread stacks and native memory:

```bash
java -XX:MaxRAMPercentage=75.0 -jar app.jar
```

If the container itself gets killed with exit code 137, the heap plus non-heap exceeded the container limit — that's a different problem (see OOMKilled).

## Fix 3: build tools (Maven, Gradle, IDE)

The error during a build is about the build JVM, not your app.

**Gradle** — in `gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m
```

Then `./gradlew --stop` so the daemon restarts with the new setting.

**Maven:**

```bash
export MAVEN_OPTS="-Xmx2g"
```

For tests run by Surefire in a forked JVM, set `<argLine>-Xmx2g</argLine>` in the Surefire plugin configuration.

**Android Studio / IntelliJ** — *Help → Change Memory Settings* for the IDE itself.

## Fix 4: stop loading everything into memory

Typical culprits:

- Reading a whole file: `Files.readAllBytes` / `readAllLines` on a huge file. Stream it instead:

  ```java
  try (Stream<String> lines = Files.lines(path)) {
      lines.forEach(this::process);
  }
  ```

- Fetching an entire table with JDBC/JPA. Page the query, or set a fetch size and stream results.
- Building huge `String`s or `List`s in a loop; collecting a stream of millions of items with `.collect(toList())`.

## Fix 5: find a leak with a heap dump

If memory grows over hours until it dies, something keeps references alive (static maps used as caches, listeners never removed, ThreadLocals in thread pools, unbounded queues).

```bash
java -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heap.hprof -jar app.jar
```

Or take one from a running process:

```bash
jcmd <PID> GC.heap_dump /tmp/heap.hprof
jcmd <PID> GC.class_histogram | head -30   # quick look at the biggest classes
```

Open the `.hprof` in Eclipse MAT or VisualVM and check the "dominator tree" / "leak suspects" for what retains the most memory. Replace unbounded caches with bounded ones (e.g. Caffeine with `maximumSize`).

## Related messages

- `GC overhead limit exceeded` — the JVM spends >98% of time in GC recovering <2% of heap; same fixes.
- `Metaspace` — too many classes loaded; raise `-XX:MaxMetaspaceSize` or fix classloader leaks.
- `unable to create native thread` — not heap; too many threads or OS limits.
