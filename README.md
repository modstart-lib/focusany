# 🎯 FocusAny - 专注提效的 AI 工具条

<div align="center">
  <img src="./demo/image/home.png" alt="FocusAny 主界面" width="800"/>
</div>

> [🇨🇳 中文](README.md) | [🇺🇸 English](README.en-US.md)

<div align="center">
  <img src="https://img.shields.io/badge/Framework-TS%2BVue3%2BElectron-blue" alt="Framework"/>
  <a href="https://focusany.com"><img src="https://img.shields.io/badge/WEB-focusany.com-blue" alt="Website"/></a>
  <a href="https://github.com/modstart-lib/focusany"><img src="https://img.shields.io/github/stars/modstart-lib/focusany.svg" alt="GitHub Stars"/></a>
  <a href="https://gitee.com/modstart-lib/focusany"><img src="https://gitee.com/modstart-lib/focusany/badge/star.svg" alt="Gitee Stars"/></a>
  <a href="https://gitcode.com/modstart-lib/focusany"><img src="https://gitcode.com/modstart-lib/focusany/star/badge.svg" alt="GitCode Stars"/></a>
  <img src="https://img.shields.io/badge/License-Apache%202.0-green" alt="License"/>
</div>

## ✨ 项目简介

**FocusAny** 是一款开源的 AI 生产力工具，融合**全局搜索、插件生态、AI 大模型、MCP 协议、可视化工作流**五大核心能力，帮你一站式搞定日常办公场景。无论是文件启动、剪贴板管理、截图录屏，还是接入 40+ LLM 提供商、编排自动化流程，FocusAny 都能胜任。

> 🎯 **目标**：成为你的「第二大脑」—— 一个可无限扩展的效率中枢。

🚀 **全局搜索即搜即得** | 🔌 **插件市场无限扩展** | 🤖 **40+ AI 大模型接入** | ⚡ **MCP 协议原生支持** | 🎨 **可视化工作流编排**

## 📋 功能特性

### 🎯 核心能力

| 功能 | 说明 |
|------|------|
| **全局搜索** | 即搜即得，支持拼音模糊匹配、上下文感知（当前文件/图片/文本/窗口） |
| **快速面板** | 快捷键唤出快捷操作面板，随叫随到 |
| **AI 大模型** | 内置 40+ LLM 提供商（OpenAI / Claude / Gemini / DeepSeek / 通义千问 等），支持自定义 |
| **MCP 协议** | 内置 MCP 服务器（127.0.0.1:61000），插件工具无缝开放给 AI |
| **可视化工作流** | 拖拽式自动化引擎（触发器 + 条件分支 + LLM 调用 + 命令执行） |
| **插件生态** | 商店安装 / ZIP 安装 / 本地开发，插件就像浏览器扩展一样方便 |
| **剪贴板历史** | 智能监控（文本/图片/文件），加密存储，支持搜索与 WebDAV 同步 |
| **截图 & 录屏** | 内置截图、录屏、取色器、锁屏等系统工具 |
| **文件管理** | 文件快速启动、资源管理器集成、WebDAV 远程同步 |
| **窗口管理** | 全局热键、分离窗口、跟随光标定位 |
| **暗黑模式** | 护眼暗黑主题，保护视力 |
| **跨平台** | 支持 **macOS / Windows / Linux** |

## 🔌 插件生态

FocusAny 拥有丰富的插件生态系统，涵盖文档编辑、设计绘图、开发工具、实用工具等场景。支持 **商店一键安装**、**本地 ZIP 导入**、**开发者目录调试** 三种安装方式。开发者可通过 `focusany-sdk` 快速构建插件。

### 🎪 插件商店

<div align="center">
  <img src="./demo/image/store.png" alt="插件商店" width="800"/>
</div>

### 📦 精选插件一览

<table width="100%">
  <thead>
    <tr>
      <th width="33%">📝 超级 Markdown</th>
      <th width="33%">📋 智能剪切板</th>
      <th width="33%">🌐 翻译助手</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="./demo/image/Markdown.png" alt="Markdown" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./demo/image/Clipboard.png" alt="Clipboard" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./demo/image/Translate.png" alt="Translate" style="width:100%; border-radius: 8px;"/></td>
    </tr>
  </tbody>
  <thead>
    <tr>
      <th>🧠 脑图编辑器 (Kityminder)</th>
      <th>📊 图表编辑器 (mxGraph)</th>
      <th>🔮 JSON 可视化 (JsonCrack)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="./demo/image/KityminderEditor.png" alt="Kityminder" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./demo/image/MxgraphEditor.png" alt="mxGraph" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./demo/image/JsonCrack.png" alt="JsonCrack" style="width:100%; border-radius: 8px;"/></td>
    </tr>
  </tbody>
  <thead>
    <tr>
      <th>🎨 tldraw 白板</th>
      <th>✏️ Excalidraw 白板</th>
      <th>🖼️ Fabric 图片设计</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="./demo/image/TldrawEditor.png" alt="tldraw" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./demo/image/ExcalidrawEditor.png" alt="Excalidraw" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./demo/image/FabricEditor.png" alt="Fabric" style="width:100%; border-radius: 8px;"/></td>
    </tr>
  </tbody>
  <thead>
    <tr>
      <th>🖼️ 图片美化</th>
      <th>🎨 Photopea 在线 PS</th>
      <th>🔐 密码管理器</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="./demo/image/ImageBeautifier.png" alt="ImageBeautifier" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./demo/image/Photopea.png" alt="Photopea" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./demo/image/Password.png" alt="Password" style="width:100%; border-radius: 8px;"/></td>
    </tr>
  </tbody>
  <thead>
    <tr>
      <th>🔢 OTP 两步验证</th>
      <th>🛠️ Ctool 程序员工具箱</th>
      <th>📝 Markdown 微信排版</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="./demo/image/Otp.png" alt="OTP" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="https://ms-assets.modstart.com/data/image/2024/12/22/42330_u3my_6770.png" alt="Ctool" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./demo/image/MarkdownWechat.png" alt="MarkdownWechat" style="width:100%; border-radius: 8px;"/></td>
    </tr>
  </tbody>
</table>

💡 **持续扩展中**：FocusAny 插件商店不断上新，开发者可通过 SDK 发布自己的插件并支持付费。

### 💻 插件开发

FocusAny 提供完善的 SDK（`focusany-sdk`），支持 Vue / React 等多种前端框架。插件通过 `config.json` 声明能力（动作、匹配规则、MCP 工具、权限等），开箱即用。

```bash
npx focusany release-prepare   # 发布前配置检查
```

## 🤖 AI 大模型 & MCP

FocusAny 内置完整的 **AI 大模型** 与 **MCP 协议**支持：

### 40+ LLM 提供商接入

无需额外配置，开箱即用上百种模型：

**国外主流**：OpenAI / Anthropic Claude / Google Gemini / Groq / Mistral / Perplexity / xAI Grok / Nvidia / GitHub Models

**国内主流**：DeepSeek / 通义千问 (Qwen) / 智谱 GLM / 月之暗面 Moonshot / 百川 / 零一万物 Yi / 阶跃星辰 Stepfun / 火山引擎 Doubao / 腾讯混元 / 百度千帆 ERNIE / 讯飞星火 / 360 智脑 / 硅基流动 / Ollama / LM Studio

### MCP 协议 (Model Context Protocol)

内置 MCP 服务器（`127.0.0.1:61000`），所有插件注册的 MCP 工具均可被 AI 直接调用。支持 **HTTP + SSE** 双协议，兼容任何 MCP 客户端。

<div align="center">
  <img src="./demo/image/system_mcp.png" alt="MCP 设置" width="800"/>
</div>

## ⚡ 可视化工作流

拖拽式自动化引擎，无需编程即可编排复杂的自动化流程：

- **触发器**：手动触发 / 定时器 (Cron) / 事件监听
- **节点类型**：命令执行 / JavaScript / 条件分支 / LLM 调用 / MCP 插件工具
- **变量传递**：节点间通过 `${variable}` 自动传参
- **运行日志**：实时追踪执行过程

<div align="center">
  <img src="./demo/image/workflow.png" alt="工作流" width="800"/>
</div>

## 🚀 快速开始

### 📦 安装使用

访问 [FocusAny 官网](https://focusany.com) 下载对应系统的安装包，一键安装即可开始使用！

### 🛠️ 本地开发

> ⚠️ 仅在 Node.js 20 环境下测试通过

#### 环境准备

**Ubuntu/Debian:**
```bash
sudo apt install -y make gcc g++ python3
```

**Windows:**
- 安装 Visual Studio 2019，并选择 "Desktop Development with C++" 组件

**macOS:**
- 安装 Python 3

#### 开发命令

```bash
# 安装项目依赖
npm install

# 启动开发模式
npm run dev

# 构建生产版本
npm run build
```


## 🤝 社区交流

> 添加好友请备注 "FocusAny"

<table width="100%">
  <thead>
    <tr>
      <th width="50%">💬 微信交流群</th>
      <th>🗣️ QQ 交流群</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="https://open.tecmz.com/code_dynamic/wx" alt="微信群" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="https://open.tecmz.com/code_dynamic/qq" alt="QQ群" style="width:100%; border-radius: 8px;"/></td>
    </tr>
  </tbody>
</table>

### 🌟 支持我们

- ⭐ 在 [GitHub](https://github.com/modstart-lib/focusany) / [Gitee](https://gitee.com/modstart-lib/focusany) / [GitCode](https://gitcode.com/modstart-lib/focusany) 上点亮 Star
- 🐛 发现 Bug 或提出建议 → [提交 Issue](https://github.com/modstart-lib/focusany/issues)
- 🔌 开发插件 → 参考 `/sdk` 目录的 `focusany-sdk`
- 📖 改进文档 → 欢迎 PR

## 📄 许可证

本项目采用 [Apache-2.0](LICENSE) 许可证开源，**可自由使用、修改和商用**。

---

<div align="center">
  <p>⭐ 如果这个项目对你有帮助，请给我们一个 Star！</p>
  <p>💝 感谢所有贡献者和用户的支持</p>
</div>
