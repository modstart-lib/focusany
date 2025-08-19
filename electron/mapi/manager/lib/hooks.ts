import {BrowserView, BrowserWindow} from "electron";
import {AppsMain} from "../../app/main";
import {PluginRecord} from "../../../../src/types/Manager";

type PluginHookType =
    | never
    | "PluginReady"
    | "PluginExit"
    | "PluginEvent"
    | "MoreMenuClick"
    | "DetachOperateClick"
    | "SubInputChange"
    | "ScreenCapture"
    | "Hotkey";

type HookType =
    | never
    | "Show"
    | "Hide"
    | "SetSubInput"
    | "RemoveSubInput"
    | "SetSubInputValue"
    | "PluginInit"
    | "PluginInitReady"
    | "PluginExit"
    | "PluginAlreadyOpened"
    | "PluginDetached"
    | "PluginState"
    | "PluginCodeInit"
    | "PluginCodeData"
    | "PluginCodeSetting"
    | "PluginCodeExit"
    | "DetachSet"
    | "Maximize"
    | "Unmaximize"
    | "EnterFullScreen"
    | "LeaveFullScreen"
    | "DetachWindowClosed";

export const executePluginHooks = async (view: BrowserView, hook: PluginHookType, data?: any) => {
    const evalJs = `
    if(window.focusany && window.focusany.hooks && typeof window.focusany.hooks.on${hook} === 'function' ) {
        try {
            window.focusany.hooks.on${hook}(${JSON.stringify(data)});
        } catch(e) {
            console.log('executePluginHooks.on${hook}.error', e);
        }
    }`;
    return view.webContents?.executeJavaScript(evalJs);
};

export const executeHooks = async (win: BrowserWindow, hook: HookType, data?: any) => {
    const evalJs = `
    if(window.__page && window.__page.hooks && typeof window.__page.hooks.on${hook} === 'function' ) {
        try {
            window.__page.hooks.on${hook}(${JSON.stringify(data)});
        } catch(e) {
            console.log('executeHooks.on${hook}.error', e);
        }
    }`;
    return win.webContents?.executeJavaScript(evalJs);
};

export const executeDarkMode = async (
    view: BrowserWindow | BrowserView,
    data: {
        plugin: PluginRecord;
        isSystem: boolean;
    }
) => {
    // console.log('executeDarkMode', data.plugin.setting);
    if ((await AppsMain.shouldDarkMode()) && (data.plugin.setting?.darkModeSupport || data.isSystem)) {
        // body and html
        view.webContents.executeJavaScript(`
        document.body.setAttribute('data-theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        `);
        if (data.isSystem) {
            view.webContents.executeJavaScript(`document.body.setAttribute('arco-theme', 'dark');`);
        }
    }
};
