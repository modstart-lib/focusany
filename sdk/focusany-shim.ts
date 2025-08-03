export const FocusAnyShim = {
    init() {
        if (window["focusany"]) {
            return;
        }

        // 定义所有支持的 focusany 功能
        const focusanySupport = {
            dbStorage: {
                setItem(key, value) {
                    localStorage.setItem(key, JSON.stringify(value));
                },
                getItem(key) {
                    const value = localStorage.getItem(key);
                    return value ? JSON.parse(value) : null;
                },
                removeItem(key) {
                    localStorage.removeItem(key);
                },
            },
        };

        // 创建一个递归的 Proxy 来处理任意深度的属性访问
        function createErrorProxy(path = "focusany", supportObj) {
            return new Proxy(() => {}, {
                get(target, prop) {
                    const currentPath = `${path}.${String(prop)}`;

                    // 如果是根级别且在支持对象中存在，直接返回
                    if (path === "focusany" && supportObj && prop in supportObj) {
                        return supportObj[prop];
                    }

                    // 对于其他属性，返回一个新的 Proxy（不支持任何属性）
                    return createErrorProxy(currentPath, null);
                },
                apply(target, thisArg, argumentsList) {
                    console.error(`FocusAny Shim: ${path}() is not supported in web environment`);
                    throw new Error(`FocusAny function ${path}() is not available in web environment`);
                },
            });
        }

        // 创建 focusany 对象
        const focusany = createErrorProxy("focusany", focusanySupport);
        // @ts-ignore
        window["focusany"] = focusany;
    },
};

// 自动初始化：在浏览器环境中自动调用 init()
if (typeof window !== "undefined") {
    FocusAnyShim.init();
}
