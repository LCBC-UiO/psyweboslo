BASEDIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
include config.txt

all: 3rdparty nodejs.simg

.PHONY: 3rdparty
3rdparty:
	$(MAKE) -C 3rdparty lighttpd_build

.PHONY: distclean
distclean:
	$(MAKE) -C 3rdparty clean

nodejs.simg: Dockerfile
	./build_from_dockerfile.sh nodejs

.PHONY: run
run: all
	cd app \
		&& singularity exec ../nodejs.simg npm install \
		&& node_modules/nodemon/bin/nodemon.js psyweb.js

