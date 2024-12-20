<script setup lang="ts">
import {useManagerStore} from "../../store/modules/manager";
import {useResultOperate} from "./Lib/resultOperate";
import {computed, ref, toRaw, watch} from "vue";
import {ActionTypeEnum, PluginType} from "../../types/Manager";
import {useSettingStore} from "../../store/modules/setting";

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

const web = ref<any | null>(null)
const manager = useManagerStore()
const webUserAgent = window.$mapi.app.getUserAgent()
const setting = useSettingStore()

const {doOpenAction} = useResultOperate()

const actions = computed(() => {
    return manager.fastPanelActions.map(a => {
        if (a.type === ActionTypeEnum.VIEW) {
            a['_web'] = null
            a['_webInit'] = false
            a['_height'] = 200
        }
        return a
    })
})

const viewActions = computed(() => {
    return actions.value.filter(a => a.type === ActionTypeEnum.VIEW)
})

const otherActions = computed(() => {
    return actions.value.filter(a => a.type !== ActionTypeEnum.VIEW)
})

watch(() => actions.value, () => {
    queryWeb()
}, {
    deep: true
})

const queryWeb = () => {
    // console.log('queryWeb.entry', viewActions.value.map(a => a['_web']))
    for (const a of manager.fastPanelActions) {
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
        ((aa) => {
            aa['_web'].addEventListener('did-finish-load', async () => {
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
                // aa['_web'].openDevTools({
                //     mode: 'detach',
                //     activate: false,
                // })
            })
            aa['_web'].addEventListener('ipc-message', (event) => {
                if ('FocusAny.FastPanel' === event.channel) {
                    const {id, type, data} = event.args[0]
                    switch (type) {
                        case 'fastPanel.setHeight':
                            aa['_height'] = data.height
                            break
                        case 'fastPanel.getHeight':
                            console.log('fastPanel.getHeight', aa['_height'])
                            aa['_web'].send(`FocusAny.FastPanel.${id}`, aa['_height'])
                            break
                    }
                }
            })
        })(a)
    }
}

</script>

<template>
    <div class="pb-fastpanel-result">
        <div style="height:40px;"></div>
        <div class="view" v-if="viewActions.length">
            <div v-for="r in viewActions"
                 class="view-item">
                <div class="view-item-head">
                    <div class="icon">
                        <img :src="r.icon"
                             :class="r.pluginType===PluginType.SYSTEM?'dark:invert':'plugin-logo-filter'"
                        />
                    </div>
                    <div class="text">
                        {{ r.title }}
                    </div>
                    <div v-if="0" class="action">
                        <a href="javascript:;">
                            关闭
                        </a>
                        <a href="javascript:;">
                            <icon-more-vertical/>
                        </a>
                    </div>
                </div>
                <div class="view-item-body">
                    <webview class="web"
                             :ref="el=>(r['_web']=el)"
                             :style="{height: r['_height'] + 'px'}"
                             :id="r.fullName"
                             :preload="r.runtime?.view.preloadBase"
                             :src="r.runtime?.view.mainFastPanel"
                             :nodeintegration="r.runtime?.view.nodeIntegration"
                             :useragent="`${webUserAgent} PluginAction/${r.fullName}`"
                             webpreferences="contextIsolation=false,sandbox=false"
                             disablewebsecurity></webview>
                </div>
            </div>
        </div>
        <div class="action">
            <div v-for="a in otherActions" class="action-item">
                <div class="action-item-box" @click="doOpenAction(a)">
                    <div class="icon">
                        <img :src="a.icon"
                             :class="a.pluginType===PluginType.SYSTEM?'dark:invert':'plugin-logo-filter'"/>
                    </div>
                    <div class="text">
                        {{ a.title }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less">
[data-theme="dark"] {
    .pb-fastpanel-result {
        .action {
            .action-item-box {
                &:hover {
                    background: #2a2a2b !important;
                }
            }
        }
    }
}

.pb-fastpanel-result {

    .view-item-head {
        display: flex;
        align-items: center;
        padding: 2px 5px;
        font-size: 12px;
        height: 26px;

        &:hover {
            .action {
                display: block;
            }
        }

        .icon {
            width: 16px;
            height: 16px;
            margin-right: 5px;

            img {
                width: 16px;
                height: 16px;
                object-fit: contain;
            }
        }

        .text {
            flex: 1;
            user-select: none;
        }

        .action {
            a {
                display: inline-block;
                border-radius: 5px;
                height: 20px;
                min-width: 20px;
                text-align: center;
                font-size: 10px;
                line-height: 20px;
                padding: 0 5px;
                margin-left: 2px;

                &:hover {
                    background: #f0f0f0;
                }
            }
        }
    }

    .view-item-body {
        .web {
            transition: height 0.3s;
        }
    }

    .action-item-box {
        text-align: center;
        padding: 10px 0 0 0;
        border-radius: 10px;
        cursor: pointer;

        &:hover {
            background-color: #F8F8F8;
        }

        .icon {
            text-align: center;

            img {
                width: 30px;
                height: 30px;
                object-fit: contain;
                margin: 0 auto;
            }
        }

        .text {
            margin-top: 5px;
            height: 32px;
            line-height: 16px;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 5px;
            font-size: 13px;
        }
    }

    .view {
        .view-item {
            border-bottom: 1px solid var(--color-border);
        }
    }

    .action {
        display: flex;
        flex-wrap: wrap;
        padding: 5px;

        .action-item {
            width: 33.3333%;
        }
    }
}
</style>
