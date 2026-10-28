#!/bin/bash
# Build and deploy errorfix to surge.sh. Token in ~/secrets/accounts.txt
set -e
. ~/.hollis_env; cd ~/site
python3 build.py
rm -f public/CNAME
SURGE_LOGIN=hollisweb@tutamail.com SURGE_TOKEN=$(grep -oP 'surge token: \K\S+' ~/secrets/accounts.txt) surge public errorfix.surge.sh
