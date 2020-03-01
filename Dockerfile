FROM ubuntu:18.04

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  nodejs \
  npm \
  locales

RUN update-locale POSIX
