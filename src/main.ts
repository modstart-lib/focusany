import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { registerNavigate, testRegistry } from './utils/test'

import ArcoVue, { Message } from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import ArcoVueIcon from '@arco-design/web-vue/es/icon'

import { i18n, t } from './lang'

import { Dialog } from './lib/dialog'
import './style.less'

import { reportErrorRender } from '../electron/mapi/log/beacon-render'
import { useSettingStore } from './store/modules/setting'
import { TaskManager } from './task'
import { eventBus } from './eventBus'

const settingStore = useSettingStore()

const app = createApp(App)

// ── Runtime diagnostics: log locally, then report remotely ────────────────
const logRendererInfo = (label: string, data: any = null) => {
    try {
        window.$mapi?.log?.info(`renderer.${label}`, data)
    } catch (e) {}
}
const logRendererError = (label: string, data: any = null) => {
    try {
        window.$mapi?.log?.error(`renderer.${label}`, data)
    } catch (e) {}
}

// Boot marker. If it never appears in the log, the bundle did not run at all
// (a resource / load failure); if it appears but "mounted" does not, the crash
// happened during mount.
logRendererInfo('boot', {
    href: location.href,
    ua: navigator.userAgent,
})

// Registered before mount on purpose: startup / mount errors are the most
// common cause of a white screen, and were previously missed because the
// handlers were only attached after `app.mount` resolved.
window.addEventListener('error', (ev) => {
    logRendererError('window.error', {
        message: ev.message,
        stack: ev.error?.stack,
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
    })
    reportErrorRender(ev.message, ev.error?.stack, ev.filename, ev.lineno, ev.colno)
})

window.addEventListener('unhandledrejection', (ev) => {
    const err = ev.reason
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    logRendererError('window.unhandledrejection', { message: msg, stack })
    reportErrorRender(msg, stack)
})

// Vue render / lifecycle errors: usually what turns a working page blank.
app.config.errorHandler = (err, instance, info) => {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    logRendererError('vue.errorHandler', { message: msg, stack, info })
    reportErrorRender(msg, stack, undefined, undefined, undefined, '/renderer/vue')
}

// Router navigation errors (bad route / lazy chunk load failure).
router.onError((err) => {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    logRendererError('router.error', { message: msg, stack })
    reportErrorRender(msg, stack, undefined, undefined, undefined, '/renderer/router')
})

app.use(ArcoVue)
app.use(ArcoVueIcon)
app.use(i18n)
app.use(store)
app.use(router)
Message._context = app._context
app.config.globalProperties.$mapi = window.$mapi
app.config.globalProperties.$dialog = Dialog
app.config.globalProperties.$t = t as any
TaskManager.init()
window.__test = testRegistry
registerNavigate((path: string) => router.push(path).then(() => {}))
// 初始化事件总线，开始监听主进程广播的系统事件
eventBus.init()

app.mount('#app').$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
    logRendererInfo('mounted', { href: location.href })
})
