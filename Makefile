PHONY: build server deploy normalize_album_images

server:
	bundle exec jekyll server --unpublished --future

build: normalize_album_images
	bundle exec jekyll build --config _config.yml,_config_production.yml

deploy: build
	AWS_PROFILE=cloudflare aws s3 sync _site/assets/videos s3://ephemeral-cx/assets/videos --endpoint-url https://2d6e53a7b34ca290aa4bd00eb995a0a0.r2.cloudflarestorage.com
	rm -rf _site/assets/videos
	ln -s ../../psu_steam _site/
	wrangler pages deploy _site --project-name=ephemeral-cx --branch=production

normalize_album_images:
	find assets/images/albums \
		-type d -name thumbnails -prune -o \
		-type f -iname "*.jpg" \
		-newermt "7 days ago" \
		-execdir mkdir --parents thumbnails \; \
		-exec magick {} -quality 75 -resize "2000x2000>" -strip {} \; \
		-exec magick {} -quality 75 -resize "850x250>" -strip \
			-set filename:directory "%[directory]" \
			-set filename:basename "%[basename]" \
			-set filename:extension "%[extension]" \
			"%[filename:directory]/thumbnails/%[filename:basename].%[filename:extension]" \;
