---
name: "Unix timestamp converter"
title: "Unix Timestamp Converter — epoch to date and date to epoch"
h1: "Unix timestamp converter"
description: "Convert Unix epoch timestamps (seconds, milliseconds, microseconds) to ISO 8601, UTC and local time, and convert dates back to timestamps. Shows the current epoch time live."
intro: "Paste a Unix timestamp to see it as a UTC, ISO 8601 and local date, or type a date to get its timestamp; seconds and milliseconds are detected automatically."
order: 4
js: timestamp
keywords: "unix timestamp converter epoch converter epoch to date timestamp to date milliseconds current unix time"
related: [web-curl-60-ssl-certificate-problem, python-ssl-certificate-verify-failed, web-net-err-cert-authority-invalid]
---
## What a Unix timestamp is

A Unix timestamp (epoch time) is the number of seconds since **1970-01-01 00:00:00 UTC**, ignoring leap seconds. It has no time zone: the same instant has the same timestamp everywhere, and only the *display* changes with your location.

| Digits | Unit | Example | Used by |
|---|---|---|---|
| 10 | seconds | `1700000000` | Unix, `date +%s`, PHP, Python `int(time.time())`, JWT `exp` |
| 13 | milliseconds | `1700000000000` | JavaScript `Date.now()`, Java `System.currentTimeMillis()` |
| 16 | microseconds | `1700000000000000` | Python `time.time_ns()//1000`, PostgreSQL internals |
| 19 | nanoseconds | `1700000000000000000` | Go `UnixNano()`, `time.time_ns()` |

This converter guesses the unit from the size of the number. A classic bug is passing seconds to something that expects milliseconds, which gives a date in January 1970; the reverse gives a date tens of thousands of years in the future.

## Getting the current timestamp

| Language | Seconds | Milliseconds |
|---|---|---|
| Shell | `date +%s` | `date +%s%3N` |
| JavaScript | `Math.floor(Date.now()/1000)` | `Date.now()` |
| Python | `int(time.time())` | `time.time_ns() // 1_000_000` |
| Go | `time.Now().Unix()` | `time.Now().UnixMilli()` |
| SQL (PostgreSQL) | `extract(epoch from now())` | |

To convert in the shell: `date -u -d @1700000000` (GNU) or `date -u -r 1700000000` (macOS).

## Clocks and certificate errors

A wrong system clock breaks TLS: certificates have `notBefore`/`notAfter` timestamps, so a machine whose clock is years off rejects valid certificates with errors like [curl: (60) SSL certificate problem](/web/web-curl-60-ssl-certificate-problem/) or [CERTIFICATE_VERIFY_FAILED](/python/python-ssl-certificate-verify-failed/). Compare the live clock above with the server's `date -u` output. The **year 2038 problem** affects systems storing seconds in a signed 32-bit integer, which overflows at `2147483647` (2038-01-19 03:14:07 UTC).
