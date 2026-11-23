#!/usr/bin/env bash
#
# 从 share-binary 仓库取二进制到 electron/resources/extra，默认只取当前平台/架构所需文件。
#
# share-binary 整仓约 1.2 GB，脚本用 partial clone（--filter=blob:none）加
# sparse-checkout，只传输目标平台目录下的文件（约 130~230 MB）。
#
# 仓库目录：<平台>-<架构>/，一个目录一套二进制：
#   osx-arm64 osx-x86 linux-arm64 linux-x86 win-x86
#   各目录内含 ffmpeg、ffprobe、scrcpy/（Windows 额外带 ScreenCapture.exe）
#
# 用法:
#   bash scripts/init.sh                  # 当前平台/架构（默认）
#   bash scripts/init.sh --arch osx-x86   # 指定平台目录，可重复
#   bash scripts/init.sh --all            # 全部平台（发布构建）
#   bash scripts/init.sh --fresh          # 删除本地克隆后重新克隆
#   bash scripts/init.sh --offline        # 只用本地已有文件，不联网
#
# 环境变量:
#   ARCHES="osx-arm64 win-x86"    同 --arch（空格或逗号分隔）
#   TARGET_ARCH=x64|arm64         交叉构建目标（与 gen-electron-builder-config.mjs 一致）
#   SHARE_BINARY_REPO_URL=url     改用镜像地址
#   INIT_LOG=path                 日志文件（默认 _temp/share-binary-init.log）
#   INIT_DEBUG=1                  打开 GIT_TRACE / GIT_CURL_VERBOSE 排查网络问题

# 整体日志走 tee：re-exec 一次再管道，保证子进程里 set -e 依然生效
if [ "${FOCUSANY_INIT_LOG_WRAPPED:-0}" != "1" ] && [ "${1:-}" != "-h" ] && [ "${1:-}" != "--help" ]; then
    _log="${INIT_LOG:-_temp/share-binary-init.log}"
    mkdir -p "$(dirname "$_log")"
    FOCUSANY_INIT_LOG_WRAPPED=1 bash "$0" "$@" 2>&1 | tee "$_log"
    _code="${PIPESTATUS[0]}"
    if [ "$_code" -ne 0 ]; then
        printf '%s [ERROR] 失败（退出码 %s），请把日志 %s 全文贴出来\n' \
            "$(date '+%Y-%m-%d %H:%M:%S')" "$_code" "$_log" >&2
    fi
    exit "$_code"
fi

set -Eeuo pipefail

REPO_URL="${SHARE_BINARY_REPO_URL:-https://github.com/modstart-lib/share-binary}"
BRANCH="main"
REPO_DIR="share-binary"
DEST_ROOT="electron/resources/extra"
ALL_ARCHES="osx-arm64 osx-x86 linux-arm64 linux-x86 win-x86"

LOG_FILE="${INIT_LOG:-_temp/share-binary-init.log}"
ARCHES="${ARCHES:-}"
FRESH=0
OFFLINE=0
FETCHED=0

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { printf '%s [INFO ] %s\n' "$(ts)" "$*"; }
warn() { printf '%s [WARN ] %s\n' "$(ts)" "$*" >&2; }
step() { printf '\n%s [STEP ] ===== %s =====\n' "$(ts)" "$*"; }
die() {
    printf '%s [ERROR] %s\n' "$(ts)" "$*" >&2
    trap - ERR
    exit 1
}
have() { command -v "$1" >/dev/null 2>&1; }
file_size() { wc -c <"$1" | tr -d ' '; }

usage() {
    awk 'NR > 2 { if ($0 == "") exit; sub(/^# ?/, ""); print }' "$0"
}

# ── 平台映射 ──────────────────────────────────────────────────────
map_arch() { # $1=uname -s $2=uname -m -> 仓库目录名
    case "$1" in
    Darwin)
        case "$2" in
        arm64 | aarch64) echo "osx-arm64" ;;
        x86_64 | amd64) echo "osx-x86" ;;
        esac
        ;;
    Linux)
        case "$2" in
        aarch64 | arm64) echo "linux-arm64" ;;
        x86_64 | amd64) echo "linux-x86" ;;
        esac
        ;;
    MINGW* | MSYS* | CYGWIN* | Windows_NT) echo "win-x86" ;;
    esac
}

detect_arch() {
    local os machine folder
    os="$(uname -s)"
    machine="$(uname -m)"
    log "uname: $(uname -srm 2>/dev/null || echo "$os $machine")"
    if [ -n "${TARGET_ARCH:-}" ]; then
        case "$TARGET_ARCH" in
        arm64) machine="arm64" ;;
        x64) machine="x86_64" ;;
        *) warn "TARGET_ARCH=$TARGET_ARCH 不是 arm64/x64，按本机架构处理" ;;
        esac
        log "TARGET_ARCH=${TARGET_ARCH}（交叉构建目标，参与架构映射）"
    fi
    folder="$(map_arch "$os" "$machine")"
    [ -n "$folder" ] || return 1
    if [ "$folder" = "win-x86" ] && [ "$machine" != "x86_64" ] && [ "$machine" != "amd64" ]; then
        warn "Windows 只有 win-x86 目录，回退到 win-x86（内含 x64 构建）"
    fi
    DETECTED_ARCH="$folder"
}

version_at_least() { # $1=当前版本 $2=最低要求 "x.y"
    local cur_major cur_minor min_major min_minor
    cur_major="${1%%.*}"
    cur_minor="${1#*.}"
    cur_minor="${cur_minor%%.*}"
    min_major="${2%%.*}"
    min_minor="${2#*.}"
    [ "${cur_major:-0}" -gt "$min_major" ] && return 0
    [ "${cur_major:-0}" -eq "$min_major" ] && [ "${cur_minor:-0}" -ge "$min_minor" ]
}

resolve_arches() {
    if [ -n "$ARCHES" ]; then
        ARCHES="$(printf '%s' "$ARCHES" | tr ',' ' ')"
        log "使用指定的平台目录: $ARCHES"
    else
        detect_arch || die "无法识别当前平台架构，请用 --arch 手动指定（${ALL_ARCHES}）"
        ARCHES="$DETECTED_ARCH"
        log "自动识别当前平台目录: ${ARCHES}（--arch 覆盖，--all 取全部平台）"
    fi

    local a out=""
    for a in $ARCHES; do
        case " $ALL_ARCHES " in
        *" $a "*) ;;
        *) die "未知平台目录 '$a'，可用: $ALL_ARCHES" ;;
        esac
        case " $out " in
        *" $a "*) ;;
        *) out="${out:+$out }$a" ;;
        esac
    done
    ARCHES="$out"
    log "最终目标平台目录: $ARCHES"
}

# ── 每个平台目录需要哪些文件 ──────────────────────────────────────
tools_for() {
    case "$1" in
    win-*) echo "ffmpeg.exe ffprobe.exe ScreenCapture.exe scrcpy" ;;
    *) echo "ffmpeg ffprobe scrcpy" ;;
    esac
}

build_patterns() {
    PATTERNS=()
    local a tool p
    for a in $ARCHES; do
        for tool in $(tools_for "$a"); do
            if [ "$tool" = "scrcpy" ]; then
                p="/$a/$tool/"
            else
                p="/$a/$tool"
            fi
            PATTERNS+=("$p")
        done
    done
    log "需要的文件:"
    for p in "${PATTERNS[@]}"; do
        log "  - ${p#/}"
    done
}

# ── 同步仓库 ──────────────────────────────────────────────────────
check_env() {
    log "工作目录: $(pwd)"
    [ -f "electron-builder.json5" ] || die "请在项目根目录执行（缺少 electron-builder.json5）"
    have git || die "找不到 git，请先安装 git"
    log "git: $(git --version 2>&1)"
    version_at_least "$(git --version | awk '{print $3}')" "2.25" ||
        die "git 版本过低（需要 2.25+ 的 sparse-checkout），请先升级 git"

    if [ "$OFFLINE" = 1 ]; then
        # git >= 2.36：缺少的 blob 直接报错，而不是偷偷联网补拉
        export GIT_NO_LAZY_FETCH=1
        log "--offline：禁止联网，缺失的文件会直接报错"
    fi
    if [ "${INIT_DEBUG:-0}" = "1" ]; then
        warn "INIT_DEBUG=1：开启 GIT_TRACE / GIT_CURL_VERBOSE，输出很长"
        export GIT_TRACE=1
        export GIT_CURL_VERBOSE=1
    fi
}

clone_repo() {
    log "克隆 ${REPO_URL}（partial clone，只按需拉取 blob）..."
    if git clone --sparse --depth 1 --filter=blob:none --progress "$REPO_URL" "$REPO_DIR"; then
        return 0
    fi
    warn "partial clone 失败（服务器或代理可能不支持 filter=blob:none），回退为普通 shallow clone"
    rm -rf "$REPO_DIR"
    git clone --sparse --depth 1 --progress "$REPO_URL" "$REPO_DIR" ||
        die "克隆失败，请检查网络或代理（可设置 INIT_DEBUG=1 查看细节）"
}

sync_repo() {
    if [ -d "$REPO_DIR/.git" ]; then
        log "复用本地克隆: $REPO_DIR"
        if [ "$OFFLINE" = 1 ]; then
            warn "--offline：跳过 fetch，直接使用本地已有文件"
            return 0
        fi
        if git -C "$REPO_DIR" fetch --depth 1 --progress origin "$BRANCH"; then
            FETCHED=1
            log "fetch 完成: $(git -C "$REPO_DIR" rev-parse --short FETCH_HEAD 2>/dev/null || echo '?')"
        else
            warn "fetch 失败（网络/代理/镜像不支持 filter？），继续使用本地已有副本"
        fi
        return 0
    fi

    [ -e "$REPO_DIR" ] && die "$REPO_DIR 已存在但不是 git 仓库，请用 --fresh 覆盖"
    [ "$OFFLINE" = 1 ] && die "--offline 需要已存在的 $REPO_DIR"
    clone_repo
}

manual_sparse() {
    log "写入 $REPO_DIR/.git/info/sparse-checkout"
    git -C "$REPO_DIR" config core.sparseCheckout true
    git -C "$REPO_DIR" config core.sparseCheckoutCone false
    printf '%s\n' "${PATTERNS[@]}" >"$REPO_DIR/.git/info/sparse-checkout"
}

check_materialized() {
    local arch tool missing=""
    for arch in $ARCHES; do
        for tool in $(tools_for "$arch"); do
            [ -e "$REPO_DIR/$arch/$tool" ] || missing="${missing:+$missing }$arch/$tool"
        done
    done
    if [ -n "$missing" ]; then
        warn "当前 sparse 规则: $(git -C "$REPO_DIR" sparse-checkout list 2>/dev/null | tr '\n' ' ')"
        die "sparse-checkout 之后仍缺少: $missing（网络/代理中断、sparse 规则未生效，或仓库里确实没有这些文件）"
    fi
}

apply_sparse() {
    log "sparse-checkout 只检出目标文件（这一步按需下载 blob，网络慢时会停留在这里）..."
    # 规则从 stdin 传入，不走命令行参数：Windows 下 Git Bash 的 MSYS 运行时会把
    # 以 "/" 开头的参数改写成 Windows 路径（"/win-x86/ffmpeg.exe" 会变成
    # "C:/Program Files/Git/win-x86/ffmpeg.exe"）。这种规则匹配不到任何文件，
    # 但 `set` 仍返回 0，问题只会在后面表现为“缺少 xxx”，很难定位。
    if ! printf '%s\n' "${PATTERNS[@]}" |
        git -C "$REPO_DIR" sparse-checkout set --no-cone --stdin; then
        warn "sparse-checkout set --stdin 失败（git 2.25 没有该参数，或网络/代理中断），改写 .git/info/sparse-checkout 兜底"
        manual_sparse
        git -C "$REPO_DIR" read-tree -mu HEAD ||
            die "sparse-checkout 失败：网络/代理中断、--offline 下缺少所需 blob，或代理不支持 partial clone"
    fi

    if [ "$FETCHED" = 1 ]; then
        log "切换到最新提交 $(git -C "$REPO_DIR" rev-parse --short FETCH_HEAD)"
        git -C "$REPO_DIR" reset --hard FETCH_HEAD >/dev/null
    fi
    log "仓库 commit: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
    if have du; then
        log "仓库 .git 体积: $(du -sh "$REPO_DIR/.git" 2>/dev/null | awk '{print $1}')（越小说明省下的流量越多）"
    fi
    check_materialized
}

# ── 复制到 extra ──────────────────────────────────────────────────
copy_files() {
    local arch tool src dst
    for arch in $ARCHES; do
        log "→ $arch"
        for tool in $(tools_for "$arch"); do
            src="$REPO_DIR/$arch/$tool"
            [ -e "$src" ] || die "缺少 ${src}（sparse-checkout 未生效？可加 --fresh 重试）"
            dst="$DEST_ROOT/$arch/$tool"
            rm -rf "$dst"
            mkdir -p "$DEST_ROOT/$arch"
            cp -a "$src" "$dst"
            if [ -d "$src" ]; then
                log "  cp -a $src -> ${dst}（$(find "$dst" -type f | wc -l | tr -d ' ') 个文件）"
            else
                chmod +x "$dst" 2>/dev/null || true
                [ "$(file_size "$src")" = "$(file_size "$dst")" ] ||
                    die "复制后大小不一致: ${dst}（源 $(file_size "$src") 字节）"
                log "  cp -a $src -> ${dst}（$(file_size "$dst") 字节）"
            fi
        done
    done
}

report() {
    local arch tool f expected size
    log "二进制清单（对照仓库记录的大小，可发现截断/损坏）:"
    for arch in $ARCHES; do
        for tool in $(tools_for "$arch"); do
            f="$DEST_ROOT/$arch/$tool"
            [ -e "$f" ] || die "复制后缺少 $f"
            [ -d "$f" ] && continue
            size="$(file_size "$f")"
            expected="$(git -C "$REPO_DIR" ls-tree -l HEAD -- "$arch/$tool" 2>/dev/null | awk '{print $4}')"
            log "  $f  size=${size} bytes (git: ${expected:-unknown})"
            if [ -n "$expected" ] && [ "$expected" != "$size" ]; then
                warn "大小与仓库记录不一致: $f"
            fi
        done
    done
    if have du; then
        log "目标目录 $(du -sh "$DEST_ROOT" 2>/dev/null | awk '{print $1}') / 仓库 $(du -sh "$REPO_DIR" 2>/dev/null | awk '{print $1}')"
    fi
}

summary() {
    cat <<EOF

========== 摘要 ==========
时间      : $(ts)
系统      : $(uname -srm 2>/dev/null || uname -a)
平台目录  : $ARCHES
仓库      : $REPO_DIR @ $(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo '?')
目标目录  : $DEST_ROOT
日志文件  : $LOG_FILE
提示:
  - 只取某个平台: bash scripts/init.sh --arch osx-x86
  - 发布取全部平台: bash scripts/init.sh --all
  - 彻底重建    : bash scripts/init.sh --fresh
==========================

EOF
}

main() {
    trap 'printf "%s [ERROR] 第 %s 行失败: %s\n" "$(ts)" "${LINENO}" "${BASH_COMMAND}" >&2' ERR

    while [ $# -gt 0 ]; do
        case "$1" in
        --arch)
            shift
            [ $# -gt 0 ] || die "--arch 需要一个平台目录名（${ALL_ARCHES}）"
            ARCHES="${ARCHES:+$ARCHES }$1"
            shift
            ;;
        --all)
            ARCHES="$ALL_ARCHES"
            shift
            ;;
        --fresh)
            FRESH=1
            shift
            ;;
        --offline)
            OFFLINE=1
            shift
            ;;
        -h | --help)
            usage
            exit 0
            ;;
        *) die "未知参数: ${1}（--help 查看用法）" ;;
        esac
    done

    step "1/5 环境检查"
    check_env

    step "2/5 解析平台目录"
    resolve_arches
    build_patterns

    step "3/5 同步 share-binary 仓库"
    if [ "$FRESH" = 1 ] && [ -e "$REPO_DIR" ]; then
        warn "--fresh：删除已存在的 $REPO_DIR"
        rm -rf "$REPO_DIR"
    fi
    sync_repo

    step "4/5 sparse-checkout（只下载目标平台的二进制）"
    apply_sparse

    step "5/5 复制到 $DEST_ROOT 并校验"
    copy_files
    report
    summary
}

main "$@"
