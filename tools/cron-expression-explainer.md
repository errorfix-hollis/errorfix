---
name: "Cron expression explainer"
title: "Cron Expression Explainer — crontab to plain English + next run times"
h1: "Cron expression explainer"
description: "Translate any crontab expression into plain English and see the next 5 run times in your time zone. Supports */n steps, ranges, lists, MON/JAN names and @daily macros."
intro: "Type a 5-field cron expression to see what it means in plain English and exactly when it will run next."
order: 2
js: cron
keywords: "cron expression crontab guru cron explainer cron schedule every 5 minutes cron syntax next run"
related: [linux-command-not-found, linux-permission-denied-running-script, linux-bad-interpreter-no-such-file, linux-unit-service-not-found]
---
## Cron syntax

```
┌───────── minute (0-59)
│ ┌─────── hour (0-23)
│ │ ┌───── day of month (1-31)
│ │ │ ┌─── month (1-12 or JAN-DEC)
│ │ │ │ ┌─ day of week (0-7 or SUN-SAT; 0 and 7 are Sunday)
* * * * *  command
```

| Syntax | Meaning | Example |
|---|---|---|
| `*` | every value | `* * * * *` every minute |
| `a,b,c` | list | `0 8,12,18 * * *` at 08:00, 12:00 and 18:00 |
| `a-b` | range (inclusive) | `0 9 * * 1-5` 09:00 on weekdays |
| `*/n` | every n-th value | `*/10 * * * *` every 10 minutes |
| `a-b/n` | every n-th value in a range | `0 8-18/2 * * *` every 2 hours from 08:00 to 18:00 |
| `@hourly` | `0 * * * *` | |
| `@daily` / `@midnight` | `0 0 * * *` | |
| `@weekly` | `0 0 * * 0` | |
| `@monthly` | `0 0 1 * *` | |
| `@yearly` / `@annually` | `0 0 1 1 *` | |
| `@reboot` | once at startup | |

## The day-of-month / day-of-week trap

If **both** day fields are restricted, cron runs when **either** matches. `0 0 13 * 5` runs on every 13th *and* every Friday, not only on Friday the 13th. If one of the two fields starts with `*`, both must match. The explainer and next-run list above follow this rule.

## Why a cron job doesn't run

- **Different environment.** Cron runs with a minimal `PATH` (usually `/usr/bin:/bin`), no shell profile and no virtualenv. Use absolute paths to every program, or you get [command not found](/linux/linux-command-not-found/).
- **Script not executable** or has Windows line endings: see [permission denied](/linux/linux-permission-denied-running-script/) and [bad interpreter](/linux/linux-bad-interpreter-no-such-file/).
- **Time zone.** Cron uses the server's time zone (check `timedatectl`), not yours.
- **`%` in the command** is turned into a newline by cron; escape it as `\%`.
- **No output.** Append `>> /tmp/job.log 2>&1` to capture errors, and check `grep CRON /var/log/syslog` or `journalctl -u cron`.

Six-field expressions with seconds (Quartz, Spring `@Scheduled`) are a different dialect and are not standard crontab syntax.
