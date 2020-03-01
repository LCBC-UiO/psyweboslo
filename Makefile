BASEDIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
#include config.txt

all: 3rdparty www/css/bootstrap.min.css

.PHONY: 3rdparty
3rdparty:
	$(MAKE) -C 3rdparty lighttpd_build

.PHONY: distclean
distclean:
	$(MAKE) -C 3rdparty clean



PORT := 8080

LIGHTTPD_BIN     := $(shell pwd)/3rdparty/lighttpd/sbin/lighttpd
LOG_DIR := $(shell pwd)/srv/log

www/css/bootstrap.min.css:
	mkdir -p www/css/
	cat 3rdparty/bootstrap.min.css.gz | gunzip > www/css/bootstrap.min.css

.PHONY: run
run: all
	PORT=$(PORT) srv/lighttpd_gen_config.sh > /tmp/$(USER)_lighttpd.conf && \
	$(LIGHTTPD_BIN) -D -f /tmp/$(USER)_lighttpd.conf
