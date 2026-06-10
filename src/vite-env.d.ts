/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/vue" />
import type { Router } from 'vue-router'
import type { TestRegistry } from './utils/test'

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $router: Router
        $dialog: Dialog
        $t: typeof import('vue-i18n').GlobalTranslate
    }
}

declare global {
    interface Window {
        __test: TestRegistry
    }
}
