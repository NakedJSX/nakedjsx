#!/bin/bash

rm -rf node_modules .yarn* yarn.lock
echo "pnpMode: loose" > .yarnrc.yml
yarn set version stable
yarn install
yarn link ../core
yarn link ../plugin-asset-image
yarn link ../plugin-asset-prism
