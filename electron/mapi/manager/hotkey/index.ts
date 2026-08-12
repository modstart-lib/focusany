import { uIOhook, UiohookKey } from 'uiohook-napi'
import { ManagerConfig } from '../config/config'
import { ManagerHotkeyHandle } from './handle'
import { HotkeyMouseButtonEnum } from '../../keys/type'
import { Events } from '../../event/main'
import { KeysMain } from '../../keys/main'
import { globalShortcut } from 'electron'

type HotkeyKeyItem = {
    name: string

    keycode: any
    altKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    times: number

    expireTimer?: number
}

type HotkeyKeySimpleItem = {
    name: string

    type: 'Ctrl' | 'Alt' | 'Meta'
    times: number
}

type HotkeyMouseItem = {
    name: string

    button: HotkeyMouseButtonEnum
    type: 'click' | 'longPress'
    clickTimes?: number

    expireTime?: number
    expireCount?: number
}

const keyToKeyCode = (key: string) => {
    if (key in UiohookKey) {
        return UiohookKey[key]
    }
    return 0
}

const keyCodeToKey = (keyCode: number) => {
    for (const key in UiohookKey) {
        if (UiohookKey[key] === keyCode) {
            return key
        }
    }
    return ''
}

export const ManagerHotkey = {
    isGrab: false,
    keyMultiDelayTime: 500,
    /** 修饰键单击有效按住时长窗口 [min, max]（毫秒），过滤快速误碰与刻意长按 */
    keySimpleHoldTime: [80, 1500] as [number, number],
    /** 修饰键触发冷却时间（毫秒），避免连续误触导致面板反复开关 */
    keySimpleCoolDown: 2000,
    keyConfigs: [
        // {
        //     name: 'mainTrigger',
        //     keycode: UiohookKey.Space,
        //     altKey: false,
        //     ctrlKey: false,
        //     metaKey: true,
        //     shiftKey: false,
        //     times: 1,
        // },
    ] as HotkeyKeyItem[],
    keySimpleConfigs: [
        // {
        //     name: 'fastPanelTrigger',
        //     type: 'Ctrl',
        //     times: 2,
        // }
    ] as HotkeyKeySimpleItem[],
    mouseLongPressTime: 500,
    mouseConfigs: [
        // {
        //     name: 'fastPanelTrigger',
        //     type: 'click',
        //     button: HotkeyButtonEnum.RIGHT,
        //     clickTimes: 1,
        // },
        // {
        //     name: 'fastPanelTrigger2',
        //     type: 'longPress',
        //     button: HotkeyButtonEnum.RIGHT,
        // }
    ] as HotkeyMouseItem[],

    _keySimple: {
        // Ctrl: null as null | 'down' | 'up',
        // Alt: null as null | 'down' | 'up',
        // Meta: null as null | 'down' | 'up',
        down: null as null | 'Ctrl' | 'Alt' | 'Meta',
        key: null as null | 'Ctrl' | 'Alt' | 'Meta',
        expire: 0,
        times: 0,
        downTime: 0,
        lastFire: 0,
    },

    init() {
        uIOhook.on('keydown', (e) => {
            if (this.isGrab) {
                const data = {
                    type: 'keydown',
                    key: keyCodeToKey(e.keycode),
                    altKey: e.altKey,
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                    shiftKey: e.shiftKey,
                }
                Events.broadcast('HotkeyWatch', data)
                return
            }
            // console.log('ManagerHotkey.keydown', e, this.keyConfigs)
            // keyConfigs start
            for (const item of this.keyConfigs) {
                if (
                    item.keycode !== e.keycode ||
                    item.altKey !== e.altKey ||
                    item.ctrlKey !== e.ctrlKey ||
                    item.metaKey !== e.metaKey ||
                    item.shiftKey !== e.shiftKey
                ) {
                    continue
                }
                if (!item.times || item.times <= 1) {
                    this.fire(item.name)
                    return
                }
                const now = Date.now()
                if (!item.expireTime || now > item.expireTime) {
                    item.expireTime = now + this.keyMultiDelayTime
                    item.expireCount = 1
                } else {
                    item.expireCount++
                    if (item.expireCount >= item.times) {
                        this.fire(item.name)
                        item.expireTime = 0
                        item.expireCount = 0
                        return
                    }
                }
            }
            // keyConfigs end
            // keySimpleConfigs start
            if (e.keycode === UiohookKey.Ctrl && !e.altKey && e.ctrlKey && !e.metaKey && !e.shiftKey) {
                this._keySimple.down = 'Ctrl'
                this._keySimple.downTime = e.time
            } else if (e.keycode === UiohookKey.Alt && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                this._keySimple.down = 'Alt'
                this._keySimple.downTime = e.time
            } else if (e.keycode === UiohookKey.Meta && !e.altKey && !e.ctrlKey && e.metaKey && !e.shiftKey) {
                this._keySimple.down = 'Meta'
                this._keySimple.downTime = e.time
            } else {
                this._keySimple.down = null
            }
            // keySimpleConfigs end
        })
        const keySimpleUp = (key: 'Ctrl' | 'Alt' | 'Meta', time: number) => {
            // console.log('keySimpleUp', key, JSON.stringify(this.keySimpleConfigs))
            // 按住时长窗口过滤：按下过短（误碰）或过长（长按）均不视为有效呼出
            const holdTime = time - this._keySimple.downTime
            if (holdTime < this.keySimpleHoldTime[0] || holdTime > this.keySimpleHoldTime[1]) {
                this._keySimple.times = 0
                this._keySimple.key = key
                this._keySimple.expire = 0
                return
            }
            const now = Date.now()
            // 触发冷却：距上次触发过短时忽略，避免误触连锁导致面板反复开关
            if (now - this._keySimple.lastFire < this.keySimpleCoolDown) {
                return
            }
            if (this._keySimple.expire > now && key === this._keySimple.key) {
                this._keySimple.times++
            } else {
                this._keySimple.times = 1
                this._keySimple.key = key
            }
            this._keySimple.expire = now + this.keyMultiDelayTime
            const fired = this.keySimpleConfigs.filter((o) => o.type === key && o.times <= this._keySimple.times)
            fired.forEach((o) => this.fire(o.name))
            if (fired.length) {
                this._keySimple.lastFire = Date.now()
            }
        }
        uIOhook.on('keyup', (e) => {
            if (
                e.keycode === UiohookKey.Ctrl &&
                !e.altKey &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.shiftKey &&
                this._keySimple.down === 'Ctrl'
            ) {
                keySimpleUp('Ctrl', e.time)
            } else if (
                e.keycode === UiohookKey.Alt &&
                !e.altKey &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.shiftKey &&
                this._keySimple.down === 'Alt'
            ) {
                keySimpleUp('Alt', e.time)
            } else if (
                e.keycode === UiohookKey.Meta &&
                !e.altKey &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.shiftKey &&
                this._keySimple.down === 'Meta'
            ) {
                keySimpleUp('Meta', e.time)
            }
        })
        // uIOhook.on('mousedown', (e) => {
        //     // console.log('ManagerHotkey.mousedown', e)
        //     for (const item of this.mouseConfigs) {
        //         if (item.button !== e.button) {
        //             continue
        //         }
        //         if (item.type === 'click') {
        //             if (!item.clickTimes || item.clickTimes <= 1) {
        //                 this.fire(item.name)
        //             } else if (item.clickTimes === e.clicks) {
        //                 this.fire(item.name)
        //             }
        //         } else if (item.type === 'longPress') {
        //             item.expireTimer = setTimeout(() => {
        //                 this.fire(item.name)
        //                 item.expireTimer = 0
        //             }, this.mouseLongPressTime)
        //         }
        //     }
        // })
        // uIOhook.on('mouseup', (e) => {
        //     // console.log('ManagerHotkey.mouseup', e)
        //     for (const item of this.mouseConfigs) {
        //         if (item.button === HotkeyMouseButtonEnum.LEFT && e.button !== 1) {
        //             continue
        //         }
        //         if (item.button === HotkeyMouseButtonEnum.RIGHT && e.button !== 2) {
        //             continue
        //         }
        //         if (item.type === 'longPress') {
        //             if (item.expireTimer) {
        //                 clearTimeout(item.expireTimer)
        //                 item.expireTimer = 0
        //             }
        //         }
        //     }
        // })
        uIOhook.start()
        this.configInit().then()
    },

    destroy() {
        uIOhook.stop()
    },

    async register() {
        // console.log('ManagerHotkey.register', this.keyConfigs)
        for (const keyConfig of this.keyConfigs) {
            const accelerator = []
            if (keyConfig.ctrlKey) {
                accelerator.push('Control')
            }
            if (keyConfig.metaKey) {
                accelerator.push('Meta')
            }
            if (keyConfig.altKey) {
                accelerator.push('Alt')
            }
            if (keyConfig.shiftKey) {
                accelerator.push('Shift')
            }
            accelerator.push(keyCodeToKey(keyConfig.keycode))
            globalShortcut.register(accelerator.join('+'), () => {
                this.fire(keyConfig.name)
            })
        }
        this.keyConfigs = this.keyConfigs.filter((item) => item.times && item.times > 1)
    },

    async configInit() {
        this.keyConfigs = []

        const config = await ManagerConfig.get()
        for (const k of ['mainTrigger']) {
            if (config[k]) {
                this.keyConfigs.push({
                    name: k,
                    keycode: keyToKeyCode(config[k].key),
                    altKey: config[k].altKey,
                    ctrlKey: config[k].ctrlKey,
                    metaKey: config[k].metaKey,
                    shiftKey: config[k].shiftKey,
                    times: config[k].times,
                })
            }
        }
        this.keySimpleConfigs = []
        if (config.fastPanelTrigger) {
            this.keySimpleConfigs.push({
                name: 'fastPanelTrigger',
                type: config.fastPanelTrigger.type,
                times: config.fastPanelTrigger.times || 1,
            })
        }

        const launches = await ManagerConfig.listLaunch()
        launches.forEach((launch, launchIndex) => {
            if (launch.hotkey && launch.keyword) {
                this.keyConfigs.push({
                    name: `launch:${launchIndex}`,
                    keycode: keyToKeyCode(launch.hotkey.key),
                    altKey: launch.hotkey.altKey,
                    ctrlKey: launch.hotkey.ctrlKey,
                    metaKey: launch.hotkey.metaKey,
                    shiftKey: launch.hotkey.shiftKey,
                    times: launch.hotkey.times,
                })
            }
        })

        // this.mouseConfigs = []
        // if (config.fastPanelTriggerButton) {
        //     this.mouseConfigs.push({
        //         name: 'fastPanelTrigger',
        //         type: config.fastPanelTriggerButton.type,
        //         button: config.fastPanelTriggerButton.button,
        //         clickTimes: config.fastPanelTriggerButton.clickTimes,
        //     })
        // }

        KeysMain.register()
    },

    async watch() {
        this.isGrab = true
    },
    async unwatch() {
        this.isGrab = false
    },

    eventListeners: {},
    fire(eventName: string, ...args: any[]) {
        // console.log('ManagerHotkey.fire', eventName, args)
        let eventParam = ''
        if (eventName.includes(':')) {
            const pcs = eventName.split(':')
            if (pcs.length > 1) {
                eventName = pcs[0]
                eventParam = pcs[1]
            }
        }
        if (eventName in ManagerHotkeyHandle) {
            ManagerHotkeyHandle[eventName](eventParam)
        }
        if (!this.eventListeners[eventName]) {
            return
        }
        this.eventListeners[eventName].forEach((cb) => cb(...args))
    },
    on(eventName: string, callback: Function) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = []
        }
        this.eventListeners[eventName].push(callback)
    },
    off(eventName: string, callback: Function) {
        if (!this.eventListeners[eventName]) {
            return
        }
        this.eventListeners[eventName] = this.eventListeners[eventName].filter((cb) => cb !== callback)
    },
}
