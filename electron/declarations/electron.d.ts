declare module "electron" {
    interface BrowserView {
        _window?: any;
        _plugin?: any;
    }

    interface BrowserWindow {
        _name?: string;
        _plugin?: any;
    }
}
