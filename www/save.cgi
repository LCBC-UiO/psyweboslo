#!/usr/bin/env bash

declare -r BASEDIR="$( cd "$(readlink -f "$( dirname "${BASH_SOURCE[0]}" )")/.." && pwd )"

json=$(cat)

file_id="$( date --rfc-3339=ns | tr " " "T" )"

mkdir -p ${BASEDIR}/data/
echo "${json}" > ${BASEDIR}/data/"${file_id}".json

return 0
