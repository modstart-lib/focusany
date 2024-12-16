

build_and_install:
	npm run build;
	rm -rfv /Applications/FocusAny.app;
	cp -a ./dist-release/mac-arm64/FocusAny.app /Applications
