#!/bin/bash

rm -rf node_modules .yarn* yarn.lock
[ -f npm-shrinkwrap.json ] && mv npm-shrinkwrap.json package-lock.json
echo "pnpMode: loose" > .yarnrc.yml
yarn set version stable
yarn install
yarn link ../core
yarn link ../plugin-asset-image
yarn link ../plugin-asset-prism
