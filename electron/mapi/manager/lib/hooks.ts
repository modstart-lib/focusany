import {BrowserView, BrowserWindow} from "electron";
import {AppsMain} from "../../app/main";

type PluginHookType = never
    | 'PluginReady'
    | 'PluginExit'
    | 'PluginEvent'
    | 'SubInputChange'
    | 'ScreenCapture'

type HookType = never
    | 'Show'
    | 'Hide'
    | 'SetSubInput'
    | 'RemoveSubInput'
    | 'SetSubInputValue'
    | 'PluginInit'
    | 'PluginExit'
    | 'PluginAlreadyOpened'
    | 'PluginDetached'
    | 'PluginState'
    | 'PluginCodeRunning'
    | 'PluginCodeSuccess'
    | 'PluginCodeError'
    | 'DetachSet'
    | 'Maximize'
    | 'Unmaximize'
    | 'EnterFullScreen'
    | 'LeaveFullScreen'

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
}

export const executeDarkMode = async (view: BrowserWindow | BrowserView, data: {
    isSystem: boolean,
}) => {
    data = Object.assign({
        isSystem: false
    }, data)
    if (await AppsMain.shouldDarkMode()) {
        // body and html
        view.webContents.executeJavaScript(`
        document.body.setAttribute('data-theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        `);
        if (data.isSystem) {
            view.webContents.executeJavaScript(`document.body.setAttribute('arco-theme', 'dark');`);
        }
    }
}
