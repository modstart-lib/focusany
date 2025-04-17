# FocusAny

![](./screenshots/cn/home.png)

![star](https://img.shields.io/badge/Framework-TS+Vue3+Electron-blue)
[![star](https://img.shields.io/badge/WEB-focusany.com-blue)](https://focusany.com)
[![star](https://img.shields.io/github/stars/modstart-lib/focusany.svg)](https://github.com/modstart-lib/focusany)
[![star](https://gitee.com/modstart-lib/focusany/badge/star.svg)](https://gitee.com/modstart-lib/focusany)
[![star](https://gitcode.com/modstart-lib/focusany/star/badge.svg)](https://gitcode.com/modstart-lib/focusany)

`FocusAny` 是一个智能AI办公助理，支持市场插件、本地插件的一键启动，快速扩展功能，提高工作效率。

## 功能特性

- 功能设置：呼出快捷键设置、开机启动
- 插件管理：支持插件安装、卸载、启用、禁用等操作
- 动作管理：支持内置和插件动作快速一览和启用、禁用、打开等操作
- 文件快速启动：支持文件快速启动，快速抵达目标文件
- 快捷键启动：支持全局快捷键启动，快速启动软件
- 数据中心：支持文件导出同步、WebDav文件同步
- 暗黑模式：支持暗黑模式，保护眼睛

## 插件支持一览

<table width="100%">
    <tbody>
        <tr>
            <td colspan="2">插件市场</td>
        </tr>
        <tr>
            <td colspan="2">
                <img style="width:100%;"
                     src="./screenshots/cn/plugin/Store.png" />
            </td>
        </tr>
        <tr>
            <td width="50%">Markdown插件</td>
            <td>Ctool程序员工具箱</td>
        </tr>
        <tr>
            <td>
                <img style="width:100%;"
                     src="./screenshots/cn/plugin/Markdown.png" />
            </td>
            <td>
                <img style="width:100%;" 
                     src="./screenshots/cn/plugin/Ctool.png" />
            </td>
        </tr>
        <tr>
            <td>翻译插件</td>
            <td>剪切板插件</td>
        </tr>
        <tr>
            <td>
                <img style="width:100%;"
                     src="./screenshots/cn/plugin/Translate.png" />
            </td>
            <td>
                <img style="width:100%;" 
                     src="./screenshots/cn/plugin/Clipboard.png" />
            </td>
        </tr>
        <tr>
            <td>脑图编辑器</td>
            <td>mxGraph编辑器</td>
        </tr>
        <tr>
            <td>
                <img style="width:100%;"
                     src="./screenshots/cn/plugin/KityminderEditor.png" />
            </td>
            <td>
                <img style="width:100%;" 
                     src="./screenshots/cn/plugin/MxgraphEditor.png" />
            </td>
        </tr>
        <tr>
            <td>tldraw白板</td>
            <td>Excalidraw白板</td>
        </tr>
        <tr>
            <td>
                <img style="width:100%;"
                     src="https://ms-assets.modstart.com/data/image/2024/12/27/20345_in2n_2839.png" />
            </td>
            <td>
                <img style="width:100%;" 
                     src="https://ms-assets.modstart.com/data/image/2024/12/23/27895_hlat_8257.png" />
            </td>
        </tr>
        <tr>
            <td>密码管理器</td>
            <td>图片美化</td>
        </tr>
        <tr>
            <td>
                <img style="width:100%;"
                     src="https://ms-assets.modstart.com/data/image/2024/12/22/12047_w27p_4263.png" />
            </td>
            <td>
                <img style="width:100%;" 
                     src="https://ms-assets.modstart.com/data/image/2024/12/22/53485_fk4f_3417.png" />
            </td>
        </tr>
        <tr>
            <td>OTP两步验证</td>
            <td>截图与贴图</td>
        </tr>
        <tr>
            <td>
                <img style="width:100%;"
                     src="https://ms-assets.modstart.com/data/image/2024/12/24/7709_81pr_6266.png" />
            </td>
            <td>
                <img style="width:100%;" 
                     src="https://ms-assets.modstart.com/data/image/2024/12/22/42330_u3my_6770.png" />
            </td>
        </tr>
    </tbody>
</table>

`FocusAny` 还支持持续支持更多的功能扩展，让你通过插件的方式，实现更多的功能。

## 安装使用

- 访问 [https://focusany.com](https://focusany.com) 下载 对应系统 安装包，一键安装即可

## 技术栈

- `electron`
- `vue3`
- `typescript`

## 本地运行开发

> 仅在 node 20 测试过

```shell
# 安装依赖
npm install
# 调试运行
npm run dev
# 打包
npm run build
```

### Ubuntu 开发环境

```shell
sudo apt install -y make gcc g++ python3
```

### Windows 开发环境

- 安装 `Visual Studio 2019`，并安装 `Desktop Development with C++` 相关组件

### MacOS 开发环境

- 安装 `Python3`

## 加入交流群

> 添加好友请备注 FocusAny

<table width="100%">
    <thead>
        <tr>
            <th width="50%">微信交流群</th>
            <th>QQ交流群</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <img style="width:100%;"
                     src="https://modstart.com/code_dynamic/modstart_wx" />
            </td>
            <td>
                <img style="width:100%;" 
                     src="https://modstart.com/code_dynamic/modstart_qq" />
            </td>
        </tr>
    </tbody>
</table>

## License

Apache-2.0
