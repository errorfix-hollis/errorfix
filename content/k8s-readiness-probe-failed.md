---
error: "Readiness probe failed"
error_full: |
  Warning  Unhealthy  12s (x6 over 62s)  kubelet  Readiness probe failed: Get "http://10.244.1.17:8080/health": dial tcp 10.244.1.17:8080: connect: connection refused
  Warning  Unhealthy  5s                 kubelet  Readiness probe failed: HTTP probe failed with statuscode: 503
  Warning  Unhealthy  3s                 kubelet  Readiness probe failed: Get "http://10.244.1.17:8080/ready": context deadline exceeded (Client.Timeout exceeded while awaiting headers)
cat: kubernetes
description: "The kubelet's readiness check against the container failed, so the pod is marked NotReady (0/1) and removed from Service endpoints. The app isn't listening yet, listens on another port/address, returns a non-2xx/3xx status, or answers too slowly."
tldr: "Run `kubectl describe pod <pod>` to see the exact probe failure, then test the endpoint from inside: `kubectl exec <pod> -- wget -qO- localhost:8080/health`. Fix the probe's `port`/`path` to match the app, make the app bind `0.0.0.0`, and raise `initialDelaySeconds`/`timeoutSeconds` or add a `startupProbe` for slow starts."
keywords: kubernetes readiness probe failed connection refused statuscode 503 context deadline exceeded pod not ready 0/1 running readinessprobe startupprobe initialdelayseconds timeoutseconds kubelet unhealthy
related: [k8s-crashloopbackoff, k8s-oomkilled, k8s-unable-to-connect-to-the-server-dial-tcp-i-o-timeout]
---
## What it means

A **readiness** probe decides whether a pod should receive traffic. When it fails, the container keeps running but shows `READY 0/1`, and the pod is taken out of the Service's endpoints — so requests through the Service or Ingress get 502/503 or "no endpoints".

Unlike a **liveness** probe, a failing readiness probe never restarts the container. If you also see restarts, the liveness probe is failing too (or the app crashes — see CrashLoopBackOff).

```bash
kubectl get pods
kubectl describe pod <pod>          # Events show the exact probe error
kubectl get endpoints <service>     # empty = no ready pods
kubectl logs <pod>
```

The text after `Readiness probe failed:` tells you which cause applies.

## Cause 1: `connection refused` — wrong port, or app not listening yet

The probe connected to the pod IP and nothing was listening on that port.

- Check the port the app actually uses (`kubectl logs`, or `kubectl exec <pod> -- netstat -tlnp` / `ss -tlnp` if available).
- The app must listen on `0.0.0.0` (all interfaces), not `127.0.0.1`. The kubelet probes the **pod IP**, so a localhost-only server refuses it. E.g. Flask `app.run(host="0.0.0.0")`, Node `server.listen(8080, "0.0.0.0")`.
- A named port (`port: http`) must match a `containerPort` name.

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8080          # must match what the app listens on
  periodSeconds: 5
```

## Cause 2: `statuscode: 503` / `404` — endpoint returns failure

HTTP probes succeed only with status 200–399. A 404 means the `path` is wrong; a 5xx means your health handler reports unhealthy (often a dependency such as the database is unreachable). Test it from inside the pod:

```bash
kubectl exec -it <pod> -- wget -qO- http://localhost:8080/health
# or: curl -i http://localhost:8080/health
```

Keep readiness checks cheap and decide carefully which dependencies should make the pod unready — if every pod checks the same database, a DB blip takes all of them out of service at once.

Spring Boot exposes `/actuator/health/readiness` when `management.endpoint.health.probes.enabled=true` (on by default in Kubernetes).

## Cause 3: `context deadline exceeded` — too slow

The default `timeoutSeconds` is **1 second**. A slow health endpoint, CPU throttling (low `resources.limits.cpu`) or a JVM warming up will exceed it.

```yaml
readinessProbe:
  httpGet: { path: /ready, port: 8080 }
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

## Cause 4: slow startup

For apps that take a long time to boot, add a `startupProbe`; readiness and liveness checks wait until it succeeds:

```yaml
startupProbe:
  httpGet: { path: /health, port: 8080 }
  periodSeconds: 5
  failureThreshold: 30      # up to 150 s to start
```

Readiness failures during the first seconds after start are normal and harmless; only persistent ones matter.

## Cause 5: exec probe returns non-zero

For `exec` probes, the command's exit code must be 0. Run the same command manually:

```bash
kubectl exec <pod> -- sh -c 'pg_isready -U postgres; echo exit=$?'
```

Common problems: the binary isn't in the image (distroless/scratch images have no shell), or the command needs env vars it doesn't get.

## Validate the YAML

Probe fields are easy to mis-indent (they belong under the container, not the pod spec). Check with the [YAML validator](/tools/yaml-validator/) and `kubectl apply --dry-run=server -f deploy.yaml`.
