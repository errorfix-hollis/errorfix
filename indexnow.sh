#!/bin/bash
# Submit all sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver...)
cd ~/site; K=$(cat .indexnow_key); HOST=${HOST:-errorfix.pages.dev}
URLS=$(grep -o "<loc>[^<]*</loc>" public/sitemap.xml | sed 's/<[^>]*>//g' | jq -R . | jq -sc .)
curl -s -o /dev/null -w "indexnow %{http_code}\n" -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"$HOST\",\"key\":\"$K\",\"keyLocation\":\"https://$HOST/$K.txt\",\"urlList\":$URLS}"
