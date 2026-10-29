#!/bin/bash
# Usage: stats.sh [days]  — total visitors + top pages/referrers from GoatCounter
T=$(cat ~/secrets/goatcounter.token); D=${1:-30}
S=$(date -u -d "-$D days" +%Y-%m-%dT00:00:00Z)
H=(-s -m 20 -H "Content-Type: application/json" -H "Authorization: Bearer $T")
B=https://errorfix.goatcounter.com/api/v0
echo "total($D d):"; curl "${H[@]}" "$B/stats/total?start=$S" | jq -c '{total, total_utc}'
echo "top pages:"; curl "${H[@]}" "$B/stats/hits?start=$S&limit=15" | jq -r '.hits[] | "\(.count)\t\(.path)"'
echo "referrers:"; curl "${H[@]}" "$B/stats/toprefs?start=$S" | jq -r '.stats[]? | "\(.count)\t\(.name)"'
