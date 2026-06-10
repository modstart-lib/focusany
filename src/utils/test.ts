/**
 * window.__test — UI 自动化测试辅助工具
 *
 * 核心思路：action 注册时机即页面就绪时机。
 * 测试侧通过 callAction 等待 action 被注册，无需额外的 ready 状态。
 *
 * 用法（页面组件 setup 中）：
 *   import { testActionSet, testActionUnset } from '@/utils/test'
 *   import { onMounted, onUnmounted } from 'vue'
 *
 *   onMounted(() => {
 *     testActionSet('list.refresh', () => loadData())
 *     testActionSet('list.add', () => { showAddModal.value = true })
 *   })
 *   onUnmounted(() => {
 *     testActionUnset('list.refresh')
 *     testActionUnset('list.add')
 *   })
 *
 * 测试框架连接后执行 window.__test['active'] = true 激活测试模式，
 * 激活后 isTestActive() 返回 true，业务代码中的 console.warn/error 才会打印。
 */

export type TestAction = (arg?: any) => Promise<any> | any

export interface TestRegistry {
    setAction(name: string, fn: TestAction): void
    unsetAction(name: string | string[]): void
    callAction(name: string, arg?: any): Promise<any>
    listActions(): string[]
    navigateTo(path: string): Promise<void>
    [key: string]: any
}

const _actions = new Map<string, TestAction>()
let _navigateFn: ((path: string) => Promise<void>) | null = null

export const testRegistry: TestRegistry = {
    setAction(name, fn) {
        _actions.set(name, fn)
    },
    unsetAction(nameOrNames) {
        const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames]
        names.forEach((n) => _actions.delete(n))
    },
    async callAction(name, arg) {
        const fn = _actions.get(name)
        if (!fn) throw new Error(`[__test] action "${name}" 未注册`)
        return await fn(arg)
    },
    listActions() {
        return Array.from(_actions.keys())
    },
    async navigateTo(path: string) {
        if (_navigateFn) {
            await _navigateFn(path)
        } else {
            window.location.hash = path
        }
    },
}

// 模块加载时立即挂载，防止 Rollup tree-shaking 移除
window.__test = testRegistry

// 测试激活标志的 key，使用变量防止 esbuild 静态分析优化
const _TEST_ACTIVE_KEY = '__testActive'

/**
 * 判断当前是否处于自动化测试激活状态。
 * 只有测试框架执行 window.__test[_TEST_ACTIVE_KEY] = true 后才返回 true。
 */
export function isTestActive(): boolean {
    return !!(window.__test as any)?.[_TEST_ACTIVE_KEY]
}

/**
 * 设置一个 test action。在 onMounted 中调用。
 */
export function testActionSet(name: string, fn: TestAction): void {
    testRegistry.setAction(name, fn)
}

/**
 * 移除一个 test action。在 onUnmounted 中调用。
 */
export function testActionUnset(name: string | string[]): void {
    testRegistry.unsetAction(name)
}

/**
 * 注册 Vue Router 导航函数，在 main.ts 中调用。
 */
export function registerNavigate(fn: (path: string) => Promise<void>): void {
    _navigateFn = fn
}

/**
 * 挂载 window.__test（兼容旧调用，模块加载时已自动挂载）。
 */
export function initTestRegistry(): void {
    window.__test = testRegistry
}
