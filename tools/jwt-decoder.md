---
name: "JWT decoder"
title: "JWT Decoder — decode a JSON Web Token's header, payload and expiry"
h1: "JWT decoder"
description: "Decode a JSON Web Token (JWT) in your browser to read its header and payload, see exp, iat and nbf as dates, and check whether it has expired. Nothing is sent to a server."
intro: "Paste a JSON Web Token to read its header and payload and see whether it has expired; decoding happens locally and the signature is not verified."
order: 7
js: jwt
keywords: "jwt decoder jwt decode online json web token decoder jwt expired exp iat check token"
related: [k8s-error-from-server-forbidden, web-cors-no-access-control-allow-origin]
---
**This tool decodes, it does not verify.** Anyone can create a token with any payload; only the server that holds the secret or public key can check the signature. Never trust a token's contents in your app without verifying it with a library such as `jsonwebtoken`, `jose` or `PyJWT`.

## JWT structure

A JWT is three Base64URL strings joined by dots: `header.payload.signature`. The header says how it was signed (`alg`, e.g. `HS256`, `RS256`, `ES256`), the payload holds the claims, and the signature covers the first two parts. The payload is only encoded, not encrypted, so don't put secrets in it. A token with **five** parts is an encrypted JWE, which cannot be read without the key.

| Claim | Name | Meaning |
|---|---|---|
| `iss` | Issuer | who issued the token (e.g. your auth server URL) |
| `sub` | Subject | the user or entity the token is about |
| `aud` | Audience | which API the token is meant for |
| `exp` | Expiration | Unix time in **seconds** after which it must be rejected |
| `nbf` | Not before | Unix time before which it must be rejected |
| `iat` | Issued at | Unix time when it was created |
| `jti` | JWT ID | unique id, used to prevent replay |

## Debugging "invalid token" and 401 errors

- **Expired:** compare `exp` with the current time. Remember it is in seconds; JavaScript's `Date.now()` is milliseconds. The [timestamp converter](/tools/unix-timestamp-converter/) helps.
- **Clock skew:** if `iat`/`nbf` is slightly in the future, the server's clock is off; most libraries accept a small `leeway`.
- **Wrong audience or issuer:** `aud`/`iss` must match exactly what the API is configured for.
- **Algorithm mismatch:** an `RS256` token checked with an HMAC secret (or vice versa) always fails.
- **Kubernetes:** service account tokens are JWTs too; decode one to see its namespace and service account when you hit [Error from server (Forbidden)](/kubernetes/k8s-error-from-server-forbidden/).
