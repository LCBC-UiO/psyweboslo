#!/usr/bin/env bash

# This script documents how to build the singularity container
# from the Dockerfile

# exit on errors
set -ETeuo pipefail

name=$1

# build docker container
docker build -t ${name} .

# docker registry server to host docker image locally
# do nothing if running, otherwise try to start registry or create registry
[ $(docker inspect -f '{{.State.Running}}' registry) == "true" ] \
  || docker container start registry \
  || docker run -d -p 5000:5000 --restart=always --name registry registry:2

# push image to local registry
docker tag ${name} localhost:5000/${name}
docker push localhost:5000/${name}

# build singularity image
rm -f ${name}.simg
SINGULARITY_NOHTTPS=1 singularity build ${name}.simg docker://localhost:5000/${name}:latest

# stop registry server
docker container stop registry
