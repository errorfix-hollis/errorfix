---
error: "OOMKilled (exit code 137)"
error_full: |
  Last State:     Terminated
    Reason:       OOMKilled
    Exit Code:    137
cat: kubernetes
description: The container used more memory than its memory limit, so the kernel's OOM killer terminated it. Raise the limit, or reduce the app's memory use and make the runtime respect the container limit.
tldr: "Confirm with `kubectl describe pod <pod>` (Reason: OOMKilled). Check real usage with `kubectl top pod <pod> --containers`. Raise `resources.limits.memory` (and requests) in the Deployment, e.g. `kubectl set resources deployment/myapp --limits=memory=1Gi --requests=memory=512Mi`, and cap runtime heaps (JVM `-XX:MaxRAMPercentage=75`, Node `--max-old-space-size`)."
keywords: kubernetes k8s oomkilled exit code 137 memory limit resources limits requests kubectl top out of memory container killed crashloopbackoff jvm node heap
related: [k8s-crashloopbackoff, node-javascript-heap-out-of-memory, docker-no-space-left-on-device]
---
## What it means

Every container with `resources.limits.memory` runs in a cgroup with that hard cap. When the processes in it try to use more, the Linux OOM killer sends SIGKILL. Exit code 137 = 128 + 9 (SIGKILL). The pod then restarts and, if it keeps happening, goes into `CrashLoopBackOff`.

Confirm it:

```bash
kubectl describe pod mypod | grep -A5 "Last State"
kubectl get pod mypod -o jsonpath='{.status.containerStatuses[*].lastState.terminated.reason}'
```

A pod *evicted* due to node memory pressure shows `Reason: Evicted` instead — that's a node-level problem, not your container limit.

## Fix 1: measure actual usage

```bash
kubectl top pod mypod --containers      # needs metrics-server
```

Compare with the configured limit:

```bash
kubectl get pod mypod -o jsonpath='{.spec.containers[*].resources}'
```

If usage under normal load sits close to the limit, the limit is simply too low.

## Fix 2: raise the memory limit

In the Deployment manifest:

```yaml
spec:
  template:
    spec:
      containers:
        - name: app
          resources:
            requests:
              memory: "512Mi"
            limits:
              memory: "1Gi"
```

Or imperatively:

```bash
kubectl set resources deployment/myapp -c app --requests=memory=512Mi --limits=memory=1Gi
```

Use `Mi`/`Gi` (binary units). `1G` and `1Gi` are different, and a lowercase `m` means milli — `memory: 512m` is half a byte, a classic mistake.

Also check for a `LimitRange` in the namespace that applies a small default limit when you don't set one:

```bash
kubectl get limitrange -n mynamespace -o yaml
```

## Fix 3: make the runtime respect the limit

Many runtimes size their heap from total memory and can exceed the cgroup limit.

**JVM** (Java 10+ / 8u191+ are container-aware). Size the heap as a fraction of the limit and leave room for metaspace, threads and native memory:

```yaml
env:
  - name: JAVA_TOOL_OPTIONS
    value: "-XX:MaxRAMPercentage=75.0"
```

**Node.js** — the V8 heap limit is set independently:

```yaml
command: ["node", "--max-old-space-size=768", "server.js"]   # MiB, below a 1Gi limit
```

**Python / Go** — no heap flag to tune for Python; for Go 1.19+ set a soft limit: `GOMEMLIMIT=900MiB`.

## Fix 4: find leaks or spikes

If memory grows steadily until the kill, it's a leak; if it jumps, it's a large request, batch, or file loaded into memory. Options:

- Watch over time: `kubectl top pod mypod --containers` repeatedly, or your Prometheus metric `container_memory_working_set_bytes` (the value the kubelet compares against the limit).
- Take heap dumps / profiles (JVM `-XX:+HeapDumpOnOutOfMemoryError`, Node `--heapsnapshot-near-heap-limit`, Go pprof).
- Reduce concurrency (worker count, thread pools) — each worker multiplies memory use. Gunicorn with 8 workers uses roughly 8× one worker.

## Fix 5: init containers and sidecars

The reason may be on another container in the pod. `kubectl describe pod` lists each container's state; check init containers and sidecars (e.g. a log shipper) too, each with its own limit.
