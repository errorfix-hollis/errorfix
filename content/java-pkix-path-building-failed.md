---
error: "javax.net.ssl.SSLHandshakeException: PKIX path building failed"
error_full: |
  javax.net.ssl.SSLHandshakeException: PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target
cat: java
description: "Java could not build a trust chain from the server's TLS certificate to a CA in its truststore (cacerts). Usually a self-signed or corporate-proxy certificate, a missing intermediate, or an outdated JDK truststore."
tldr: "Import the server's (or your corporate proxy's) CA certificate into the JDK truststore: `keytool -importcert -alias myca -file ca.crt -cacerts -storepass changeit`, then restart the app. If the server is missing its intermediate certificate, fix the server's chain instead. Never disable certificate validation in production."
keywords: java pkix path building failed sslhandshakeexception unable to find valid certification path to requested target suncertpathbuilderexception keytool cacerts truststore maven gradle self-signed certificate
related: [java-sockettimeoutexception-read-timed-out, web-x509-certificate-signed-by-unknown-authority, git-ssl-certificate-problem-unable-to-get-local-issuer-certificate]
---
## What it means

During the TLS handshake Java checks the server's certificate against the CAs in its truststore (by default `$JAVA_HOME/lib/security/cacerts`). `PKIX path building failed` means it could not link the certificate to any trusted root. Java does **not** use the operating system's certificate store on Linux or macOS by default, so a URL that works in the browser or with `curl` can still fail in Java.

First look at what the server actually sends:

```bash
openssl s_client -connect api.example.com:443 -servername api.example.com -showcerts </dev/null
```

Check the `Certificate chain` section and the `issuer=` lines.

## Cause 1: corporate proxy or TLS inspection

Antivirus software or a company proxy (Zscaler, Netskope, Blue Coat...) re-signs HTTPS traffic with its own root CA. The OS trusts it; the JDK does not. Typical symptom: Maven, Gradle or IntelliJ can't download dependencies.

## Fix 1: import the CA into the JDK truststore

Export the root CA (from the `openssl` output above, from your browser, or ask IT) as `ca.crt`, then:

```bash
# JDK 9+
sudo keytool -importcert -alias corp-root -file ca.crt -cacerts -storepass changeit -noprompt

# JDK 8
sudo keytool -importcert -alias corp-root -file ca.crt \
  -keystore "$JAVA_HOME/jre/lib/security/cacerts" -storepass changeit -noprompt
```

`changeit` is the default password. Make sure you import into the **same JDK** that runs your app (`java -XshowSettings:properties -version 2>&1 | grep java.home`). IDEs and Gradle often use their own bundled JDK.

Alternatively, keep a separate truststore and point the JVM at it:

```bash
java -Djavax.net.ssl.trustStore=/path/truststore.jks -Djavax.net.ssl.trustStorePassword=secret -jar app.jar
```

On Windows, JDK 21+ users can also use `-Djavax.net.ssl.trustStoreType=Windows-ROOT` to trust the Windows certificate store.

## Cause 2: self-signed server certificate

Internal services with self-signed certificates fail the same way. Import that server's certificate (or the internal CA that signed it) with the same `keytool` command.

## Cause 3: server doesn't send the intermediate certificate

Browsers often fetch missing intermediates automatically; Java doesn't. If `openssl s_client` shows only one certificate in the chain (depth 0) and its issuer is an intermediate CA, the server is misconfigured. Fix it on the server: configure the full chain (e.g. nginx `ssl_certificate` should point to `fullchain.pem`, not `cert.pem`).

## Cause 4: very old JDK

An old JDK may lack newer root CAs (e.g. after Let's Encrypt's root change). Update to a current JDK release — the bundled `cacerts` is updated with each update release.

## Don't do this

Code that installs a "trust all" `TrustManager` or `HostnameVerifier` makes the error go away by disabling TLS security entirely. Use it only for a throwaway local test, never in shipped code.
