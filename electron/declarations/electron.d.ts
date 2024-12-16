declare module 'electron' {
    interface BrowserView {
        _window?: any;
        _plugin?: any;
    }
}

