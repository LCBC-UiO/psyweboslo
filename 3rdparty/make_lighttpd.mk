modules := $(modules) \
	lighttpd

LIBVER := 1.4.54

.PHONY: lighttpd_download
lighttpd_download: download/lighttpd-${LIBVER}.tar.gz

.PHONY: lighttpd_build
lighttpd_build: lighttpd/sbin/lighttpd

.PHONY: lighttpd_clean
lighttpd_clean:
	$(RM) -r lighttpd
	$(RM) -r lighttpd_build

.PHONY: lighttpd_dlclean
lighttpd_dlclean:
	$(RM) download/lighttpd-${LIBVER}.tar.gz

download/lighttpd-${LIBVER}.tar.gz:
	mkdir -p download/
	cd download && wget https://download.lighttpd.net/lighttpd/releases-1.4.x/lighttpd-${LIBVER}.tar.gz

lighttpd/sbin/lighttpd: download/lighttpd-${LIBVER}.tar.gz
	mkdir -p lighttpd_build \
		&& cd lighttpd_build \
		&& tar xf ../download/lighttpd-${LIBVER}.tar.gz \
		&& cd lighttpd-$(LIBVER) \
		&& ./configure --prefix=$(BASEDIR)/lighttpd --without-bzip2
	$(MAKE) -C lighttpd_build/lighttpd-$(LIBVER)
	$(MAKE) -C lighttpd_build/lighttpd-$(LIBVER) install
	$(RM) -r lighttpd_build
