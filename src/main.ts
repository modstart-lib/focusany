import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

import ArcoVue, { Message } from "@arco-design/web-vue";
import ArcoVueIcon from "@arco-design/web-vue/es/icon";
import "@arco-design/web-vue/dist/arco.css";

import { i18n, t } from "./lang";

import "./style.less";
import { Dialog } from "./lib/dialog";

import { TaskManager } from "./task";
import { useSettingStore } from "./store/modules/setting";
import { reportErrorRender } from "../electron/mapi/log/beacon-render";

const settingStore = useSettingStore();

const app = createApp(App);
app.use(ArcoVue);
app.use(ArcoVueIcon);
app.use(i18n);
app.use(store);
app.use(router);
Message._context = app._context;
app.config.globalProperties.$mapi = window.$mapi;
app.config.globalProperties.$dialog = Dialog;
app.config.globalProperties.$t = t as any;
TaskManager.init();

app.mount("#app").$nextTick(() => {
    postMessage({ payload: "removeLoading" }, "*");

    window.addEventListener("error", (ev) => {
        reportErrorRender(
            ev.message,
            ev.error?.stack,
            ev.filename,
            ev.lineno,
            ev.colno,
        );
    });

    window.addEventListener("unhandledrejection", (ev) => {
        const err = ev.reason;
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        reportErrorRender(msg, stack);
    });
});
