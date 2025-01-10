import {ActionTypeEnum, PluginType} from "../../../types/Manager";
import {computed, watch} from "vue";
import {useManagerStore} from "../../../store/modules/manager";
import {useSettingStore} from "../../../store/modules/setting";


const executePluginHooks = async (web: any, hook: string, data?: any) => {
    const evalJs = `
    if(window.focusany && window.focusany.hooks && typeof window.focusany.hooks.on${hook} === 'function' ) {
        try {
            window.focusany.hooks.on${hook}(${JSON.stringify(data)});
        } catch(e) {
            console.log('executePluginHooks.on${hook}.error', e);
        }
    }`;
    return web.executeJavaScript(evalJs);
};

const manager = useManagerStore()
const setting = useSettingStore()

export const useViewOperate = (type: 'fastPanel' | 'main') => {

    const webUserAgent = window.$mapi.app.getUserAgent()

    const viewActions = computed(() => {
        if (type === 'main') {
            return manager.viewActions.map(a => {
                a['_web'] = null
                a['_webInit'] = false
                a['_webReady'] = false
                a['_height'] = a.runtime?.view?.heightView || 100
                return a
            })
        }
        return manager.fastPanelViewActions.map(a => {
            a['_web'] = null
            a['_webInit'] = false
            a['_webReady'] = false
            a['_height'] = a.runtime?.view?.heightView || 100
            return a
        })
    })

    const queryWeb = () => {
        // console.log('queryWeb.entry', viewActions.value.map(a => a['_web']))
        for (const a of viewActions.value) {
            if (a.type !== ActionTypeEnum.VIEW) {
                continue
            }
            if (!a['_web'] || a['_webInit']) {
                continue
            }
            a['_webInit'] = true
            // console.log('queryWeb', a['_web'])
            const readyData = {}
            readyData['actionName'] = a.name
            readyData['actionMatch'] = a.runtime?.match
            readyData['actionMatchFiles'] = a.runtime?.matchFiles
            readyData['requestId'] = a.runtime?.requestId as any
            readyData['reenter'] = false
            readyData['isView'] = true;
            ((aa) => {
                aa['_web'].addEventListener('did-finish-load', async () => {
                    aa['_webReady'] = true
                    aa['_web'].insertCSS(`body{overflow: hidden;}`)
                    if (setting.shouldDarkMode()) {
                        aa['_web'].executeJavaScript(`
                        document.body.setAttribute('data-theme', 'dark');
                        document.documentElement.setAttribute('data-theme', 'dark');
                    `);
                        if (aa.pluginType === PluginType.SYSTEM) {
                            aa['_web'].executeJavaScript(`document.body.setAttribute('arco-theme', 'dark');`);
                        }
                    }
                })
                aa['_web'].addEventListener('dom-ready', async () => {
                    await executePluginHooks(a['_web'], 'PluginReady', readyData)
                    if (aa.runtime?.view?.showViewDevTools) {
                        aa['_web'].openDevTools({
                            mode: 'detach',
                            activate: false,
                        })
                    }
                })
                aa['_web'].addEventListener('ipc-message', (event) => {
                    if ('FocusAny.View' === event.channel) {
                        const {id, type, data} = event.args[0]
                        switch (type) {
                            case 'view.setHeight':
                                aa['_height'] = data.height
                                break
                            case 'view.getHeight':
                                // console.log('view.getHeight', aa['_height'])
                                aa['_web'].send(`FocusAny.View.${id}`, aa['_height'])
                                break
                        }
                    }
                })
            })(a)
        }
    }

    watch(() => viewActions.value, () => {
        queryWeb()
    }, {
        deep: true
    })


    return {
        webUserAgent,
        viewActions
    }
}
