BASEDIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
include config.txt

all: 3rdparty app/css/bootstrap.min.css nodejs.simg

.PHONY: 3rdparty
3rdparty:
	$(MAKE) -C 3rdparty lighttpd_build

.PHONY: distclean
distclean:
	$(MAKE) -C 3rdparty clean

www/css/bootstrap.min.css:
	mkdir -p app/css/
	cat 3rdparty/bootstrap.min.css.gz | gunzip > www/css/bootstrap.min.css

nodejs.simg: Dockerfile
	./build_from_dockerfile.sh nodejs

.PHONY: run
run: all
	cd app \
		&& singularity exec ../nodejs.simg npm install \
		&& node_modules/nodemon/bin/nodemon.js main.js

