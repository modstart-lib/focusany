/// <reference path="focusany.d.ts" />

// 自动导入并初始化 FocusAny Shim
import {FocusAnyShim} from "./focusany-shim";

// 在浏览器环境中自动初始化
if (typeof window !== "undefined") {
    FocusAnyShim.init();
}

// 导出 shim 以便手动控制
export {FocusAnyShim};
