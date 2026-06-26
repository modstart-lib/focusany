# 🎯 FocusAny - AI-Powered Productivity Launcher

<div align="center">
  <img src="./demo/image/home.png" alt="FocusAny Main Interface" width="800"/>
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

## ✨ Introduction

**FocusAny** is an open-source AI productivity tool that combines **global search, plugin ecosystem, LLM integration, MCP protocol, and visual workflow automation** into one powerful desktop app. Whether you need quick file access, clipboard management, screenshot tools, AI chat across 40+ providers, or automated workflow orchestration — FocusAny has you covered.

> 🎯 **Mission**: Be your "second brain" — an infinitely extensible productivity hub.

🚀 **Global Search** | 🔌 **Plugin Ecosystem** | 🤖 **40+ LLM Providers** | ⚡ **MCP Protocol** | 🎨 **Visual Workflow**

## 📋 Features

### 🎯 Core Capabilities

| Feature | Description |
|---------|-------------|
| **Global Search** | Instant search with pinyin fuzzy matching, context-aware (current file/image/text/window) |
| **Quick Panel** | Hotkey-activated action panel, follows your cursor |
| **AI LLM Integration** | 40+ built-in providers (OpenAI / Claude / Gemini / DeepSeek / Qwen, etc.), custom providers & models |
| **MCP Protocol** | Built-in MCP server (127.0.0.1:61000), plugin tools exposed to AI via standardized protocol |
| **Visual Workflow** | Drag-and-drop automation engine (triggers + conditions + LLM calls + commands) |
| **Plugin Ecosystem** | Install from store / local ZIP / dev directory — as easy as browser extensions |
| **Clipboard History** | Real-time monitoring (text/image/file), encrypted storage, search & WebDAV sync |
| **Screenshot & Recording** | Built-in screenshot, screen recording, color picker, screen lock |
| **File Management** | Quick file launch, file explorer integration, WebDAV remote sync |
| **Window Management** | Global hotkeys, detachable windows, cursor-tracked positioning |
| **Dark Mode** | Eye-friendly dark theme |
| **Cross-Platform** | Supports **macOS / Windows / Linux** |

## 🔌 Plugin Ecosystem

FocusAny features a rich plugin ecosystem covering document editing, design, development tools, and utilities. Plugins can be installed via **one-click from the store**, **imported from local ZIP**, or **loaded from a dev directory**. Developers can build plugins quickly with `focusany-sdk`.

### 🎪 Plugin Store

<div align="center">
  <img src="./demo/image/store.png" alt="Plugin Store" width="800"/>
</div>

### 📦 Featured Plugins

<table width="100%">
  <thead>
    <tr>
      <th width="33%">📝 Super Markdown</th>
      <th width="33%">📋 Smart Clipboard</th>
      <th width="33%">🌐 Translate</th>
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
      <th>🧠 Mind Map (Kityminder)</th>
      <th>📊 Diagram Editor (mxGraph)</th>
      <th>🔮 JSON Visualizer (JsonCrack)</th>
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
      <th>🎨 tldraw Whiteboard</th>
      <th>✏️ Excalidraw Whiteboard</th>
      <th>🖼️ Fabric Image Editor</th>
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
      <th>🖼️ Image Beautifier</th>
      <th>🎨 Photopea (Online PS)</th>
      <th>🔐 Password Manager</th>
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
      <th>🔢 OTP Two-Factor Auth</th>
      <th>🛠️ Ctool Developer Toolbox</th>
      <th>📝 Markdown WeChat Format</th>
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

💡 **Growing Fast**: New plugins are added regularly. Developers can publish and monetize their own plugins via the FocusAny SDK.

### 💻 Plugin Development

FocusAny provides a complete SDK (`focusany-sdk`) supporting Vue / React and other frameworks. Plugins declare capabilities via `config.json` (actions, match rules, MCP tools, permissions, etc.).

```bash
npx focusany release-prepare   # Pre-publish config check
```

## 🤖 AI LLM & MCP

FocusAny ships with built-in **AI LLM** and **MCP (Model Context Protocol)** support:

### 40+ LLM Providers

Use hundreds of models out of the box:

**Global**: OpenAI / Anthropic Claude / Google Gemini / Groq / Mistral / Perplexity / xAI Grok / Nvidia / GitHub Models

**China**: DeepSeek / Qwen / GLM (Zhipu) / Moonshot (Kimi) / Baichuan / Yi (01.AI) / Stepfun / Doubao (Volcengine) / Tencent Hunyuan / Baidu ERNIE / iFlytek Spark / 360 Brain / SiliconFlow / Ollama / LM Studio

### MCP Protocol (Model Context Protocol)

Built-in MCP server at `127.0.0.1:61000` with **HTTP + SSE** dual protocol support. All plugin-registered MCP tools are accessible to any MCP-compatible AI client.

<div align="center">
  <img src="./demo/image/system_mcp.png" alt="MCP Settings" width="800"/>
</div>

## ⚡ Visual Workflow

Drag-and-drop automation engine for creating complex workflows without coding:

- **Triggers**: Manual / Timer (Cron) / Event-based
- **Node Types**: Command execution / JavaScript / Conditions / LLM calls / MCP plugin tools
- **Variables**: Auto-pass data between nodes with `${variable}` syntax
- **Run Logs**: Real-time execution tracking

<div align="center">
  <img src="./demo/image/workflow.png" alt="Workflow" width="800"/>
</div>

## 🚀 Quick Start

### 📦 Installation

Visit the [FocusAny Website](https://focusany.com) to download the installation package for your system. Install with one click and start using!

### 🛠️ Development

> ⚠️ Only tested with Node.js 20

#### Prerequisites

**Ubuntu/Debian:**
```bash
sudo apt install -y make gcc g++ python3
```

**Windows:**
- Install Visual Studio 2019 with the "Desktop Development with C++" workload

**macOS:**
- Install Python 3

#### Commands

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build
```


## 🤝 Community

> Please mention "FocusAny" when adding friends

<table width="100%">
  <thead>
    <tr>
      <th width="50%">💬 WeChat Group</th>
      <th>🗣️ QQ Group</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="https://open.tecmz.com/code_dynamic/wx" alt="微信群" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="https://open.tecmz.com/code_dynamic/qq" alt="QQ群" style="width:100%; border-radius: 8px;"/></td>
    </tr>
  </tbody>
</table>

### 🌟 Support Us

- ⭐ Star us on [GitHub](https://github.com/modstart-lib/focusany) / [Gitee](https://gitee.com/modstart-lib/focusany) / [GitCode](https://gitcode.com/modstart-lib/focusany)
- 🐛 Report bugs or suggest features → [Open an Issue](https://github.com/modstart-lib/focusany/issues)
- 🔌 Build a plugin → Check out `/sdk` directory and `focusany-sdk`
- 📖 Improve docs → PRs welcome

## 📄 License

This project is open-sourced under the [Apache-2.0](LICENSE) license. **Free to use, modify, and distribute commercially.**

---

<div align="center">
  <p>⭐ If this project helps you, please give us a Star!</p>
  <p>💝 Thanks to all contributors and users for your support</p>
</div>
