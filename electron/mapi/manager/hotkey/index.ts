import {uIOhook, UiohookKey} from "uiohook-napi";
import {ManagerConfig} from "../config/config";
import {ManagerHotkeyHandle} from "./handle";
import {HotkeyMouseButtonEnum} from "../../keys/type";
import {Events} from "../../event/main";
import {KeysMain} from "../../keys/main";
import {globalShortcut} from "electron";

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

    type: 'Ctrl' | 'Alt' | 'Meta',
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
                if (item.keycode !== e.keycode ||
                    item.altKey !== e.altKey ||
                    item.ctrlKey !== e.ctrlKey ||
                    item.metaKey !== e.metaKey ||
                    item.shiftKey !== e.shiftKey) {
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
            } else if (e.keycode === UiohookKey.Alt && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                this._keySimple.down = 'Alt'
            } else if (e.keycode === UiohookKey.Meta && !e.altKey && !e.ctrlKey && e.metaKey && !e.shiftKey) {
                this._keySimple.down = 'Meta'
            } else {
                this._keySimple.down = null
            }
            // keySimpleConfigs end
        })
        const keySimpleUp = (key: 'Ctrl' | 'Alt' | 'Meta') => {
            // console.log('keySimpleUp', key, JSON.stringify(this.keySimpleConfigs))
            const now = Date.now()
            if (this._keySimple.expire > now && key === this._keySimple.key) {
                this._keySimple.times++
            } else {
                this._keySimple.times = 1
                this._keySimple.key = key
            }
            this._keySimple.expire = now + this.keyMultiDelayTime
            this.keySimpleConfigs
                .filter(o => (o.type === key && o.times <= this._keySimple.times))
                .forEach(o => this.fire(o.name))
        }
        uIOhook.on('keyup', (e) => {
            if (e.keycode === UiohookKey.Ctrl && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && this._keySimple.down === 'Ctrl') {
                keySimpleUp('Ctrl')
            } else if (e.keycode === UiohookKey.Alt && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && this._keySimple.down === 'Alt') {
                keySimpleUp('Alt')
            } else if (e.keycode === UiohookKey.Meta && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && this._keySimple.down === 'Meta') {
                keySimpleUp('Meta')
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
