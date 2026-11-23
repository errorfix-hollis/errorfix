---
error: "java.net.SocketTimeoutException: Read timed out"
error_full: |
  java.net.SocketTimeoutException: Read timed out
  	at java.base/sun.nio.ch.NioSocketImpl.timedFinishRead(NioSocketImpl.java:288)
  	at java.base/sun.nio.ch.NioSocketImpl.implRead(NioSocketImpl.java:314)
  	at java.base/java.net.Socket$SocketInputStream.read(Socket.java:1099)
cat: java
description: "The TCP connection was established, but the server sent no data within the read (socket) timeout. The server is slow, stuck, or a proxy/firewall is swallowing the response. It differs from `connect timed out`, which means the connection was never opened."
tldr: "Find out why the server is slow (check its logs, run the same request with `curl -m 120 -v`). If the operation is legitimately long, raise the read timeout on your client: `HttpURLConnection.setReadTimeout(60000)`, `HttpClient` `HttpRequest.newBuilder().timeout(Duration.ofSeconds(60))`, OkHttp `.readTimeout(60, SECONDS)`, JDBC `socketTimeout=60000`. Don't set it to 0 (infinite)."
keywords: java.net.sockettimeoutexception read timed out connect timed out httpurlconnection setreadtimeout okhttp resttemplate webclient httpclient jdbc socketTimeout feign spring boot timeout
related: [java-connectexception-connection-refused, web-504-gateway-timeout, java-spring-failed-to-configure-a-datasource]
---
## What it means

Two separate timeouts exist on a socket:

- **connect timeout**: how long to wait for the TCP handshake. Exceeding it gives `SocketTimeoutException: connect timed out` (host unreachable, firewall drop, wrong IP).
- **read timeout** (`SO_TIMEOUT`): the maximum gap between bytes once connected. Exceeding it gives `Read timed out`.

So with `Read timed out`, the network path works; the server just didn't answer in time. It is not a total-request timeout: a slow trickle of data resets it.

## Step 1: measure the real response time

```bash
curl -v -o /dev/null -m 120 -w 'connect=%{time_connect}s first-byte=%{time_starttransfer}s total=%{time_total}s\n' https://api.example.com/report
```

If `first-byte` is larger than your client's read timeout, either speed the server up or raise the timeout. If curl also hangs forever, the server (or a proxy in between) never responds: look at server logs, thread dumps (`jstack <pid>`), DB locks and slow queries.

## Fix 1: set the timeout on your HTTP client

`HttpURLConnection` (default is infinite unless a library sets it):

```java
HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
c.setConnectTimeout(5_000);
c.setReadTimeout(60_000);
```

Java 11+ `HttpClient` (throws `HttpTimeoutException` instead):

```java
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5)).build();
HttpRequest req = HttpRequest.newBuilder(URI.create(url))
    .timeout(Duration.ofSeconds(60)).build();
```

OkHttp (default 10 s read):

```java
OkHttpClient client = new OkHttpClient.Builder()
    .connectTimeout(5, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .build();
```

Spring `RestTemplate`:

```java
SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
f.setConnectTimeout(5_000);
f.setReadTimeout(60_000);
RestTemplate rest = new RestTemplate(f);
```

Spring Cloud OpenFeign (`application.yml`):

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          default:
            connect-timeout: 5000
            read-timeout: 60000
```

## Fix 2: database connections

JDBC drivers raise it when a query runs longer than the socket timeout.

```
jdbc:mysql://db:3306/app?connectTimeout=5000&socketTimeout=60000
jdbc:postgresql://db:5432/app?connectTimeout=5&socketTimeout=60
```

(MySQL Connector/J uses milliseconds, the PostgreSQL driver uses seconds.) Usually the better fix is the slow query: check `EXPLAIN`, missing indexes and lock waits.

## Fix 3: a proxy or load balancer in between

If the backend is fast when called directly but times out through a proxy, the proxy may be buffering or dropping idle connections. Check `proxy_read_timeout` in nginx, the idle timeout of AWS ALB (60 s default), and corporate proxies (`-Dhttps.proxyHost`). Long jobs are better as async: return `202 Accepted` and poll.

## Fix 4: stale pooled connections

Intermittent `Read timed out` on the first request after idle can mean a pooled keep-alive connection was silently dropped by a NAT/firewall. Evict idle connections (Apache HttpClient `evictIdleConnections(30, SECONDS)`), and enable retries for idempotent requests only.

## Don't

Avoid `setReadTimeout(0)`: an infinite timeout turns a slow server into hung threads in your app. Pick a value above the server's p99 latency and handle the exception (retry with backoff or fail fast).
