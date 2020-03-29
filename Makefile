BASEDIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
include config.txt

.PHONY: install
install: app/themes/active

all: nodejs.simg install

.PHONY: distclean
distclean:

nodejs.simg: Dockerfile
	./build_from_dockerfile.sh nodejs

.PHONY: run
run: all
	cd app \
		&& singularity exec ../nodejs.simg npm install \
		&& node_modules/nodemon/bin/nodemon.js psyweb.js

run_dev: all
	cd dev \
		&& singularity exec ../nodejs.simg bash start.sh

app/themes/active:
	cd app/themes/ && ln -s default active

.PHONY: publish_dev
publish_dev:
	bash dev/publish.sh

distclean:
	$(RM) -r dev/node_modules
	$(RM) -r dev/export/*.zip