<script setup lang="ts">
import {useManagerStore} from "../../store/modules/manager";
import {useResultOperate} from "./Lib/resultOperate";
import {PluginType} from "../../types/Manager";
import {useViewOperate} from "../Main/Lib/viewOperate";

const manager = useManagerStore();
const {doOpenAction} = useResultOperate();

const {webUserAgent, viewActions} = useViewOperate("fastPanel");
</script>

<template>
    <div class="pb-fastpanel-result">
        <div style="height: 40px"></div>
        <div class="view" v-if="viewActions.length">
            <div v-for="r in viewActions" class="view-item">
                <div class="view-item-head">
                    <div class="icon">
                        <img
                            :src="r.icon"
                            :class="r.pluginType === PluginType.SYSTEM ? 'dark:invert' : 'plugin-logo-filter'"
                        />
                    </div>
                    <div class="text">
                        {{ r.title }}
                    </div>
                    <div v-if="0" class="action">
                        <a href="javascript:;"> {{$t('关闭')}} </a>
                        <a href="javascript:;">
                            <icon-more-vertical />
                        </a>
                    </div>
                </div>
                <div class="view-item-body">
                    <webview
                        class="web"
                        :ref="el => (r['_web'] = el)"
                        :style="{height: r['_height'] + 'px'}"
                        :id="r.fullName"
                        :preload="r.runtime?.view?.preloadBase"
                        :src="r.runtime?.view?.mainView"
                        :nodeintegration="r.runtime?.view?.nodeIntegration"
                        :useragent="`${webUserAgent} PluginAction/${r.fullName}`"
                        webpreferences="contextIsolation=false,sandbox=false"
                        disablewebsecurity
                    ></webview>
                    <div class="view-item-loading" v-if="!r['_webReady']">
                        <icon-loading />
                    </div>
                </div>
            </div>
        </div>
        <div class="action">
            <div v-for="a in manager.fastPanelMatchActions" class="action-item">
                <div class="action-item-box" @click="doOpenAction(a)">
                    <div class="icon">
                        <img
                            :src="a.icon"
                            draggable="false"
                            :class="a.pluginType === PluginType.SYSTEM ? 'dark:invert' : 'plugin-logo-filter'"
                        />
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
    user-select: none;

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
        position: relative;

        .web {
            transition: height 0.3s;
        }

        .view-item-loading {
            position: absolute;
            inset: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(255, 255, 255, 0.8);
            z-index: 1;
        }
    }

    .action-item-box {
        text-align: center;
        padding: 10px 0 0 0;
        border-radius: 10px;
        cursor: pointer;

        &:hover {
            background-color: #f8f8f8;
        }

        &:active {
            background-color: #e8e8e8;
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
