#!/bin/bash
# Build errorfix and deploy to GitHub Pages (repo errorfix-hollis/errorfix-hollis.github.io).
set -e
. ~/.hollis_env; cd ~/site
python3 build.py
rm -f public/CNAME
touch public/.nojekyll
D=$(mktemp -d); cp -a public/. "$D"/; cd "$D"
git init -q -b main; git add -A; git -c user.name=Hollis -c user.email=hollisweb@tutamail.com commit -qm "Deploy $(date -u +%FT%TZ)"
git -c credential.helper= push -qf "https://errorfix-hollis:$(cat ~/secrets/github.token)@github.com/errorfix-hollis/errorfix-hollis.github.io.git" main 2>&1 | grep -v -i token || true
cd ~; rm -rf "$D"
echo "Deployed to https://errorfix-hollis.github.io"
