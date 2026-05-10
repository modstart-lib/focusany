

# make test              → 完整测试套件（构建验证）
# make test biz          → 直接运行全部 test/biz/*.test.ts（需已启动 Electron）
# make test ui           → 直接运行全部 test/ui/*.test.ts（需已启动 Electron）
# make test biz xxx      → 单独运行 test/biz/xxx.test.ts
# make test ui  xxx      → 单独运行 test/ui/xxx.test.ts
_TEST_TYPE := $(word 2,$(MAKECMDGOALS))
_TEST_NAME := $(word 3,$(MAKECMDGOALS))

.PHONY: test biz ui dev-seed dev publish build_and_install build-cli

test:
	@if [ "$(_TEST_TYPE)" = "biz" ] && [ -n "$(_TEST_NAME)" ]; then \
		npx tsx test/biz/$(_TEST_NAME).test.ts; \
	elif [ "$(_TEST_TYPE)" = "ui" ] && [ -n "$(_TEST_NAME)" ]; then \
		npx tsx test/ui/$(_TEST_NAME).test.ts; \
	elif [ "$(_TEST_TYPE)" = "biz" ]; then \
		failed=0; \
		for f in test/biz/*.test.ts; do [ -f "$$f" ] || continue; npx tsx "$$f" || failed=1; done; \
		exit $$failed; \
	elif [ "$(_TEST_TYPE)" = "ui" ]; then \
		failed=0; \
		for f in test/ui/*.test.ts; do [ -f "$$f" ] || continue; npx tsx "$$f" || failed=1; done; \
		exit $$failed; \
	else \
		npm run build:preview 2>&1 | tail -20; \
	fi

biz ui:
	@:

dev-seed:
	npx tsx test/dev-seed.ts

dev:
	npm run dev

publish:
	ss-publish publish ../focusany
	cd ../focusany && make test

build_and_install:
	rm -rfv dist-release/*.dmg
	rm -rfv dist-release/*.blockmap
	rm -rfv dist-release/*.yml
	rm -rfv dist-release/*.yaml
	rm -rfv dist-release/*.zip
	npm run build:mac-arm
	rm -rfv /Applications/FocusAny.app
	cp -a ./dist-release/mac-arm64/FocusAny.app /Applications

build-cli:
	@VERSION=$$(node -p "require('./package.json').version") && \
	mkdir -p dist-cli && \
	echo "Building CLI version $$VERSION ..." && \
	cd cli && \
	GOOS=darwin  GOARCH=amd64  go build -ldflags="-X main.Version=$$VERSION" -o ../dist-cli/focusany-darwin-x64    . && \
	GOOS=darwin  GOARCH=arm64  go build -ldflags="-X main.Version=$$VERSION" -o ../dist-cli/focusany-darwin-arm64  . && \
	GOOS=linux   GOARCH=amd64  go build -ldflags="-X main.Version=$$VERSION" -o ../dist-cli/focusany-linux-x64     . && \
	GOOS=linux   GOARCH=arm64  go build -ldflags="-X main.Version=$$VERSION" -o ../dist-cli/focusany-linux-arm64   . && \
	GOOS=windows GOARCH=amd64  go build -ldflags="-X main.Version=$$VERSION" -o ../dist-cli/focusany-win-x64.exe   . && \
	GOOS=windows GOARCH=arm64  go build -ldflags="-X main.Version=$$VERSION" -o ../dist-cli/focusany-win-arm64.exe . && \
	echo "CLI binaries built in dist-cli/"

# 吸收 `make test biz/ui <name>` 中任意测试名称，防止 "No rule to make target" 报错
.DEFAULT:
	@:
