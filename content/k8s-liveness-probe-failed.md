---
error: "Liveness probe failed"
error_full: |
  Warning  Unhealthy  12s (x3 over 32s)  kubelet  Liveness probe failed: Get "http://10.244.1.17:8080/healthz": dial tcp 10.244.1.17:8080: connect: connection refused
  Normal   Killing    12s                kubelet  Container app failed liveness probe, will be restarted
  Warning  Unhealthy  5s                 kubelet  Liveness probe failed: HTTP probe failed with statuscode: 500
cat: kubernetes
description: "The kubelet's liveness check on a container failed `failureThreshold` times in a row, so Kubernetes killed and restarted the container. Either the app is really stuck, or the probe is misconfigured (wrong port/path, too short timeouts, no time to start)."
tldr: "Run `kubectl describe pod <pod>` to see the probe error. Fix the probe's `port`/`path` to match the app, add a `startupProbe` (or raise `initialDelaySeconds`) for slow-starting apps, increase `timeoutSeconds`/`failureThreshold`, and keep liveness endpoints cheap (no database checks). Check `kubectl logs <pod> --previous` for why the app stopped responding."
keywords: kubernetes liveness probe failed connection refused statuscode 500 context deadline exceeded container failed liveness probe will be restarted startupprobe initialdelayseconds timeoutseconds failurethreshold kubelet restarts
related: [k8s-readiness-probe-failed, k8s-crashloopbackoff, k8s-oomkilled]
---
## What it means

A `livenessProbe` answers "is this container still alive?". The kubelet runs it every `periodSeconds`. After `failureThreshold` consecutive failures (default 3), it kills the container and restarts it according to the pod's `restartPolicy`. You see a growing `RESTARTS` count, and eventually `CrashLoopBackOff`.

```bash
kubectl get pod <pod>
kubectl describe pod <pod>        # Events: "Liveness probe failed: ..."
kubectl logs <pod> --previous     # logs of the killed container
```

The text after `Liveness probe failed:` tells you which case you're in.

## Cause 1: wrong port or path (`connection refused`, `404`)

`connect: connection refused` means nothing listens on that port; `statuscode: 404` means the path doesn't exist. Compare with the app:

```yaml
livenessProbe:
  httpGet:
    path: /healthz          # must exist in the app
    port: 8080              # the container port, not the Service port
```

Also make sure the app listens on `0.0.0.0`, not `127.0.0.1` — the kubelet probes the pod IP. Test from inside:

```bash
kubectl exec <pod> -- wget -qO- http://localhost:8080/healthz
kubectl port-forward <pod> 8080:8080   # then curl localhost:8080/healthz
```

## Cause 2: the app starts slower than the probe allows

JVM, Rails, Django or ML-model containers can take a minute to start. If liveness kicks in before that, the container is killed during startup, forever. Use a `startupProbe`; liveness and readiness are paused until it succeeds:

```yaml
startupProbe:
  httpGet: { path: /healthz, port: 8080 }
  periodSeconds: 5
  failureThreshold: 30       # up to 150s to start
livenessProbe:
  httpGet: { path: /healthz, port: 8080 }
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3
```

(`initialDelaySeconds` also works, but a startup probe adapts to actual startup time.)

## Cause 3: timeouts (`context deadline exceeded`, `Client.Timeout exceeded`)

The default `timeoutSeconds` is **1 second**. Under load, during garbage collection, or with CPU throttling from a low CPU limit, the endpoint may answer late. Raise `timeoutSeconds` (e.g. 3–5) and check throttling:

```bash
kubectl top pod <pod>
```

If CPU sits at the limit, raise `resources.limits.cpu` or remove the CPU limit.

## Cause 4: the health check does too much (`statuscode: 500`/`503`)

A liveness endpoint that checks the database, cache or other services fails when *they* are down, and Kubernetes restarts healthy containers in a loop, making the outage worse. Liveness should only answer "is this process responsive?". Put dependency checks in the **readiness** probe, which takes the pod out of the Service without restarting it.

## Cause 5: the app really hangs or dies

Deadlocks, exhausted thread pools, or memory pressure make the app stop responding — that's exactly what liveness is for. Look at `kubectl logs <pod> --previous`, and check `Last State` in `kubectl describe pod`: `Reason: OOMKilled` means a memory problem, not a probe problem.

## Exec and TCP probes

```yaml
livenessProbe:
  exec:
    command: ["pg_isready", "-U", "postgres"]
```

An exec probe fails when the command exits non-zero (or the binary isn't in the image — `executable file not found`). A `tcpSocket` probe only checks that the port accepts connections.
