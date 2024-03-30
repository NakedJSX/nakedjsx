#!/bin/bash
cd "$(dirname "$0")/.."
set -o errexit
set -o nounset

rm -rf yarn.lock package-lock.json
git checkout npm-shrinkwrap.json
npm audit fix
