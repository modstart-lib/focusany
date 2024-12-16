import {uIOhook, UiohookKey} from "uiohook-napi";
import {ManagerConfig} from "../config/config";
import {ManagerHotkeyHandle} from "./handle";
import {HotkeyMouseButtonEnum} from "../../keys/type";
import {Events} from "../../event/main";
import {KeysMain} from "../../keys/main";
import {globalShortcut} from "electron";
import {isMac} from "../../../lib/env";

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
        //     type: 'Ctrl'
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
        Ctrl: null as null | 'down' | 'up',
        Alt: null as null | 'down' | 'up',
        Meta: null as null | 'down' | 'up',
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
            for (const item of this.keyConfigs) {
                if (item.keycode !== e.keycode ||
                    item.altKey !== e.altKey ||
                    item.ctrlKey !== e.ctrlKey ||
                    item.metaKey !== e.metaKey ||
                    item.shiftKey !== e.shiftKey) {
                    continue
                }
                if (!item.times || item.times <= 1) {
                    this.fire(item.name)
                    continue
                }
                const now = Date.now()
                if (!item.expireTime) {
                    item.expireTime = now + this.keyMultiDelayTime
                    item.expireCount = 1
                } else {
                    if (now > item.expireTime) {
                        item.expireTime = now + this.keyMultiDelayTime
                        item.expireCount = 1
                    } else {
                        item.expireCount++
                        if (item.expireCount >= item.times) {
                            this.fire(item.name)
                            item.expireTime = 0
                            item.expireCount = 0
                        }
                    }
                }
            }
            for (const k in this._keySimple) {
                if (this._keySimple[k] === 'down') {
                    this._keySimple[k] = null
                }
            }
            if (e.keycode === UiohookKey.Ctrl && !e.altKey && e.ctrlKey && !e.metaKey && !e.shiftKey) {
                this._keySimple.Ctrl = 'down'
            } else if (e.keycode === UiohookKey.Alt && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                this._keySimple.Alt = 'down'
            } else if (e.keycode === UiohookKey.Meta && !e.altKey && !e.ctrlKey && e.metaKey && !e.shiftKey) {
                this._keySimple.Meta = 'down'
            }
        })
        uIOhook.on('keyup', (e) => {
            if (e.keycode === UiohookKey.Ctrl && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && this._keySimple.Ctrl === 'down') {
                this._keySimple.Ctrl = 'up'
                this.keySimpleConfigs.filter(item => item.type === 'Ctrl').forEach(item => this.fire(item.name))
            } else if (e.keycode === UiohookKey.Alt && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && this._keySimple.Alt === 'down') {
                this._keySimple.Alt = 'up'
                this.keySimpleConfigs.filter(item => item.type === 'Alt').forEach(item => this.fire(item.name))
            } else if (e.keycode === UiohookKey.Meta && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && this._keySimple.Meta === 'down') {
                this._keySimple.Meta = 'up'
                this.keySimpleConfigs.filter(item => item.type === 'Meta').forEach(item => this.fire(item.name))
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
        this.keyConfigs = this.keyConfigs.filter(item => item.times && item.times > 1)
    },

    async configInit() {

        this.keyConfigs = []

        const config = await ManagerConfig.get()
        if (config.mainTrigger) {
            this.keyConfigs.push({
                name: 'mainTrigger',
                keycode: keyToKeyCode(config.mainTrigger.key),
                altKey: config.mainTrigger.altKey,
                ctrlKey: config.mainTrigger.ctrlKey,
                metaKey: config.mainTrigger.metaKey,
                shiftKey: config.mainTrigger.shiftKey,
                times: config.mainTrigger.times,
            })
        }
        this.keySimpleConfigs = []
        if (config.fastPanelTrigger) {
            this.keySimpleConfigs.push({
                name: 'fastPanelTrigger',
                type: config.fastPanelTrigger.type,
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
        this.eventListeners[eventName].forEach(cb => cb(...args))
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
        this.eventListeners[eventName] = this.eventListeners[eventName].filter(cb => cb !== callback)
    },

}
