PHONY: build server deploy normalize_album_images

build:
	bundle exec jekyll build

server:
	bundle exec jekyll server --unpublished --future

deploy: build
	rsync --recursive --delete --progress _site/ shane@shanetully.com:/srv/http/blog/
	ssh shane@shanetully.com "cd /srv/http/blog && chown -R shane:www-data . && chmod -R 775 . && ln -s ../psu_steam psu_steam"

normalize_album_images:
	find assets/images/albums \
		-type d -name thumbnails -prune -o \
		-type f -iname "*.jpg" \
		-newermt "7 days ago" \
		-execdir mkdir --parents thumbnails \; \
		-exec magick {} -resize "2000x2000>" -strip {} \; \
		-exec magick {} -resize "850x250>" -strip \
			-set filename:directory "%[directory]" \
			-set filename:basename "%[basename]" \
			-set filename:extension "%[extension]" \
			"%[filename:directory]/thumbnails/%[filename:basename].%[filename:extension]" \;
