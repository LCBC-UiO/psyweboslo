#!/usr/bin/env bash

declare -r BASEDIR="$( cd "$(readlink -f "$( dirname "${BASH_SOURCE[0]}" )")/" && pwd )"

cd "${BASEDIR}"

npm install
node psyweb_dev.js
