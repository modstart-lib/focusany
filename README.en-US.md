# 🎯 FocusAny - Smart AI Office Assistant

<div align="center">
  <img src="./screenshots/en/home.png" alt="FocusAny Main Interface" width="800"/>
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

> [🇨🇳 中文](README.md) | [🇺🇸 English](README.en-US.md)

## ✨ Introduction

`FocusAny` is a powerful AI-powered office assistant designed to boost your productivity. It supports one-click launching of marketplace plugins and local plugins, allowing you to quickly extend functionality and create a personalized office environment.

🚀 **Quick Launch** | 🔧 **Plugin Extensions** | 🎨 **Modern UI** | 🌙 **Dark Mode Support**

## 📋 Features

- ⚙️ **Settings**: Customizable shortcut keys, auto-start on boot
- 🛠️ **Plugin Management**: One-click install, uninstall, enable/disable plugins
- 🎯 **Action Management**: Quick preview and management of built-in and plugin actions
- 📁 **File Quick Launch**: Instantly locate target files
- ⌨️ **Shortcut Launch**: Global hotkeys for quick app launching
- 💾 **Data Center**: File export sync, WebDAV file sync
- 🌙 **Dark Mode**: Eye-friendly dark theme interface

## 🔌 Plugin Ecosystem

FocusAny features a rich plugin ecosystem supporting various office scenarios:

### Plugin Market Overview

<table width="100%">
  <thead>
    <tr>
      <th colspan="2">🎪 Plugin Market</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colspan="2">
        <img src="./screenshots/en/plugin/Store.png" alt="Plugin Market" style="width:100%; border-radius: 8px;"/>
      </td>
    </tr>
    <tr>
      <th width="50%">📝 Markdown Plugin</th>
      <th>🛠️ Ctool Developer Toolbox</th>
    </tr>
    <tr>
      <td><img src="./screenshots/en/plugin/Markdown.png" alt="Markdown Plugin" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./screenshots/en/plugin/Ctool.png" alt="Ctool Toolbox" style="width:100%; border-radius: 8px;"/></td>
    </tr>
    <tr>
      <th>🌐 Translation Plugin</th>
      <th>📋 Clipboard Plugin</th>
    </tr>
    <tr>
      <td><img src="./screenshots/en/plugin/Translate.png" alt="Translation Plugin" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./screenshots/en/plugin/Clipboard.png" alt="Clipboard Plugin" style="width:100%; border-radius: 8px;"/></td>
    </tr>
    <tr>
      <th>🧠 Mind Map Editor</th>
      <th>📊 mxGraph Editor</th>
    </tr>
    <tr>
      <td><img src="./screenshots/en/plugin/KityminderEditor.png" alt="Mind Map Editor" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="./screenshots/en/plugin/MxgraphEditor.png" alt="mxGraph Editor" style="width:100%; border-radius: 8px;"/></td>
    </tr>
    <tr>
      <th>🎨 tldraw Whiteboard</th>
      <th>✏️ Excalidraw Whiteboard</th>
    </tr>
    <tr>
      <td><img src="https://ms-assets.modstart.com/data/image/2024/12/27/20345_in2n_2839.png" alt="tldraw Whiteboard" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="https://ms-assets.modstart.com/data/image/2024/12/23/27895_hlat_8257.png" alt="Excalidraw Whiteboard" style="width:100%; border-radius: 8px;"/></td>
    </tr>
    <tr>
      <th>🔐 Password Manager</th>
      <th>🖼️ Image Beautifier</th>
    </tr>
    <tr>
      <td><img src="https://ms-assets.modstart.com/data/image/2024/12/22/12047_w27p_4263.png" alt="Password Manager" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="https://ms-assets.modstart.com/data/image/2024/12/22/53485_fk4f_3417.png" alt="Image Beautifier" style="width:100%; border-radius: 8px;"/></td>
    </tr>
    <tr>
      <th>🔢 OTP Two-Factor Auth</th>
      <th>📸 Screenshot & Paste</th>
    </tr>
    <tr>
      <td><img src="https://ms-assets.modstart.com/data/image/2024/12/24/7709_81pr_6266.png" alt="OTP Auth" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="https://ms-assets.modstart.com/data/image/2024/12/22/42330_u3my_6770.png" alt="Screenshot Tool" style="width:100%; border-radius: 8px;"/></td>
    </tr>
  </tbody>
</table>

💡 **Continuous Expansion**: FocusAny is constantly adding more plugins, enabling unlimited functionality through plugins!

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

## 🏗️ Tech Stack

<div align="center">
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron"/>
  <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue.js"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
</div>

## 📚 Project Structure

```
focusany/
├── electron/          # Electron main process code
├── src/              # Vue.js frontend source
├── public/           # Static assets
├── scripts/          # Build scripts
├── screenshots/      # Screenshot assets
└── dist-release/     # Build output
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
      <td><img src="https://modstart.com/code_dynamic/modstart_wx" alt="WeChat Group" style="width:100%; border-radius: 8px;"/></td>
      <td><img src="https://modstart.com/code_dynamic/modstart_qq" alt="QQ Group" style="width:100%; border-radius: 8px;"/></td>
    </tr>
  </tbody>
</table>

## 📄 License

This project is open-sourced under the [Apache-2.0](LICENSE) license.

---

<div align="center">
  <p>⭐ If this project helps you, please give us a Star!</p>
  <p>💝 Thanks to all contributors and users for your support</p>
</div>
