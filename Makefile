PHONY: build server deploy

build:
	bundle exec jekyll build

server:
	bundle exec jekyll server

deploy: build
	rsync --recursive --delete --progress _site/ shane@shanetully.com:/srv/http/blog/
	ssh shane@shanetully.com "cd /srv/http/blog && ln -s ../psu_steam psu_steam"
