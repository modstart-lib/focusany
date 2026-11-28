# FocusAny 使用方式

FocusAny 是一款开源的 AI 生产力工具，把全局搜索、插件生态、AI 大模型、MCP 协议和可视化工作流放在同一个桌面应用里。

- 官网与下载：https://focusany.com
- 源码：https://github.com/modstart-lib/focusany

## 1. 安装与启动

1. 打开 https://focusany.com ，下载 macOS / Windows / Linux 对应的安装包，双击安装。
2. 首次启动如提示授予「辅助功能」「屏幕录制」等权限，请按提示完成；未授予辅助功能时全局快捷键不会生效，之后可从托盘菜单的「权限设置」再次打开。
3. 启动后程序常驻托盘（macOS 为菜单栏图标）；主窗口按 `Esc` 收起，需要退出时用托盘菜单的「退出」。
4. 按 `Alt + Space`（macOS 为 `Option + Space`）唤出主输入框，窗口有焦点时再按一次收起。
5. 轻按一下 `Ctrl`（短按后松开）唤出快捷面板。
6. 唤出键与快捷面板的触发方式在「系统设置 → 功能设置」里修改（「快捷键」页管的是启动项快捷键）。

## 2. 日常操作

- 输入即搜：在主输入框输入应用名、文件名或插件关键词，支持拼音模糊匹配与首字母匹配。
- 上下文匹配：先选中文件、复制图片或聚焦某个窗口再唤出，结果会自动匹配对应的插件动作。
- 键盘操作：`↑` / `↓` 选择结果，`Enter` 打开，`Esc` 关闭当前打开的插件或收起主窗口。
- 插件市场：主输入框输入「插件市场」（或 `store`）回车打开，可搜索并一键安装插件。
- 已安装插件：在「系统设置 → 插件管理」查看、禁用动作、卸载或刷新。
- AI 大模型：在「系统设置 → AI模型」添加供应商与 API Key，模型是否支持图像识别 / 工具调用在同一处查看。
- 工作流：在「系统设置 → 工作流」拖拽编排触发器、条件分支、LLM 调用与命令执行。
- MCP：内置 MCP 服务器（默认 `127.0.0.1:61000`），任何 MCP 客户端都能调用插件注册的工具（入口见「系统设置 → MCP」）。

## 3. 安装插件

FocusAny 支持三种插件安装方式：

1. 插件商店：主输入框输入「插件市场」（或 `store`）回车打开，搜索后一键安装。
2. 导入本地 ZIP 包：在「系统设置 → 插件管理」中选择安装本地插件。
3. 本地目录调试：用命令行 `focusany plugin install <插件目录>` 安装；也可以在插件管理里选择该插件目录下的 `config.json`。

安装完成后，在主输入框输入插件关键词就能唤起；配置了文件类型的插件，也会在选中对应文件时出现在结果里。

## 4. 命令行（可选）

FocusAny 提供命令行工具（不随安装包附带，需要单独获取），适合批量操作、脚本与自动化。

获取方式：

- 从源码构建：在仓库根目录执行 `make build-cli`，产物是 `dist-cli/focusany-<平台>-<架构>`（如 `focusany-darwin-arm64`、`focusany-linux-x64`），把它加入 `PATH` 或用完整路径调用。
- 在已安装 `focusany-sdk` 的项目里转调本机 CLI：`npx focusany cli <命令>`（桥接会查找 `PATH`、`~/.focusany/bin`、`dist-cli/` 等位置，本机仍需已有 CLI 二进制）。

> 注意：直接 `npx focusany skill` 不可用（SDK CLI 没有这个命令），要走 `npx focusany cli skill`。

常用命令：

```sh
focusany doctor                        # 环境自检：运行状态、认证、MCP、模型、插件
focusany info                          # 数据目录、插件目录、日志目录与本地 API
focusany plugin list                   # 列出已安装插件
focusany plugin info <插件名>           # 查看插件详情（动作 / MCP 工具 / 开发环境）
focusany plugin install <目录或zip>     # 安装插件
focusany plugin run <插件名>            # 启动插件
focusany plugin uninstall <插件名>      # 卸载插件
focusany mcp tools                     # 列出插件暴露的 MCP 工具
focusany log --lines 100               # 查看最近 100 行日志
focusany skill                         # 再次输出本说明
```

需要和桌面应用交互的命令（`doctor`、`plugin list/info/install/run/uninstall`、`mcp`）要先启动 FocusAny；`skill`、`info`、`log`、`plugin check/package/release-prepare` 只读本地数据，应用没运行也能用。使用自定义数据目录时设置环境变量 `FOCUSANY_DATA_ROOT`（默认 `~/.focusany/data`）。

## 5. 常见问题

- 唤不出主窗口：确认程序仍在托盘运行；macOS 首次使用需要在「权限设置」里授予辅助功能；唤出键可在「系统设置 → 功能设置」调整，避开被其他软件占用的组合。
- CLI 提示连接失败：需要与桌面应用交互的命令必须让 FocusAny 处于运行状态；数据目录被隔离时先 `export FOCUSANY_DATA_ROOT=<数据目录>` 再执行。
- CLI 看不到已安装插件：多半是数据目录不一致，用 `focusany info` 核对 dataRoot 后重试。
- 插件修改不生效：先在「系统设置 → 插件管理」点「刷新」；仍不生效时重新构建并重新安装（本地目录插件用 `focusany plugin install <目录>`）。
- 查看日志：`focusany log`，或「关于」页面里的日志按钮打开日志目录；插件日志用 `focusany log --plugin <插件名>`。

## 6. 相关链接

- 官网与下载：https://focusany.com
- 源码仓库：https://github.com/modstart-lib/focusany
- 问题反馈：https://github.com/modstart-lib/focusany/issues
- 插件开发：仓库 `/sdk` 目录的 `focusany-sdk`（类型声明、测试基础库与 CLI）
