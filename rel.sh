#!/bin/bash
cd "$(dirname "$0")"

rm -rf node_modules .yarn .pnp.* yarn.lock
TEMP_PKG=$(mktemp)
jq 'del(.packageManager, .resolutions)' < package.json > "$TEMP_PKG"
mv "$TEMP_PKG" package.json
npm cache verify
[ -f package-lock ] && rm package-lock.json
npm install
npm shrinkwrap
