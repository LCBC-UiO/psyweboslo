#!/usr/bin/env bash

set -ETeuo pipefail

declare -r BASEDIR="$( cd "$(readlink -f "$( dirname "${BASH_SOURCE[0]}" )")/.." && pwd )"

source ${BASEDIR}/config.txt

tmpdir=$(mktemp -d)

cd ${tmpdir}

git clone ${BASEDIR} psyweboslo

cd psyweboslo

mv dev psyweboslo_dev

zip psyweboslo_dev -r psyweboslo_dev

scp psyweboslo_dev.zip debian@${WEBSERVERHOSTNAME}:psyweboslo/app/img/

rm -rf $tmpdir
