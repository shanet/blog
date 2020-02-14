PHONY: deploy

deploy:
	bundle exec jekyll build
	rsync --recursive --delete --progress _site/ shane@shanetully.com:/srv/http/blog/
	ssh shane@shanetully.com "cd /srv/http/blog && ln -s ../psu_steam psu_steam"
