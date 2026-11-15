#!/bin/bash
# Submit up to N (default: remaining daily quota) not-yet-submitted sitemap URLs to Bing Webmaster API.
cd ~/site; K=$(cat ~/secrets/bingwmt.key); S=https://errorfix-hollis.github.io/
DONE=.bing_submitted; touch $DONE
Q=$(curl -s "https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota?siteUrl=$S&apikey=$K" | jq -r .d.DailyQuota)
N=${1:-$Q}; [ "$N" -gt "$Q" ] && N=$Q
[ "$N" -le 0 ] && { echo "quota 0"; exit 0; }
grep -o "<loc>[^<]*</loc>" public/sitemap.xml | sed 's/<[^>]*>//g' | grep -vxF -f $DONE | head -n $N > /tmp/bing_batch
[ -s /tmp/bing_batch ] || { echo "nothing new"; exit 0; }
BODY=$(jq -Rn --arg s "$S" '{siteUrl:$s, urlList:[inputs]}' < /tmp/bing_batch)
R=$(curl -s -X POST -H "Content-Type: application/json; charset=utf-8" -d "$BODY" "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=$K")
echo "$R"
if echo "$R" | grep -q '"d":null'; then cat /tmp/bing_batch >> $DONE; echo "submitted $(wc -l < /tmp/bing_batch) (quota was $Q)"; fi
