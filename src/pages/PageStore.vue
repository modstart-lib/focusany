<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from "vue";
import PageWebviewStatus from "../components/common/PageWebviewStatus.vue";
import {useSettingStore} from "../store/modules/setting";
import {useUserStore} from "../store/modules/user";

const setting = useSettingStore();
const user = useUserStore();

const status = ref<InstanceType<typeof PageWebviewStatus> | null>(null);
const web = ref<any | null>(null);
const webPreload = ref("");
const webUrl = ref("");
const webUserAgent = window.$mapi.app.getUserAgent();

const installProgressCallback = data => {
    // console.log('PluginInstallProgress', data)
    web.value.executeJavaScript(
        `window.__storePluginInstallProgress && window.__storePluginInstallProgress(${JSON.stringify(data)})`
    );
};

onMounted(async () => {
    web.value.addEventListener("did-fail-load", (event: any) => {
        status.value?.setStatus("fail");
    });
    web.value.addEventListener("dom-ready", e => {
        // web.value.openDevTools()
        window.$mapi.user.refresh();
        web.value.executeJavaScript(`
document.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName !== 'A') return;
    const url = target.href
    if(url.startsWith('javascript:')) return;
    const urlPath = new URL(url).pathname;
    event.preventDefault();
    window.$mapi.user.openWebUrl(url)
});
`);
        status.value?.setStatus("success");
    });
    status.value?.setStatus("loading");
    webPreload.value = await window.$mapi.app.getPreload();
    webUrl.value = await window.$mapi.user.getWebEnterUrl(`/store`);
    window.__page.onBroadcast("PluginInstallProgress", installProgressCallback);
});

onBeforeUnmount(() => {
    window.__page.offBroadcast("PluginInstallProgress", installProgressCallback);
});
</script>

<template>
    <div class="h-full">
        <webview
            ref="web"
            id="web"
            :src="webUrl"
            :useragent="webUserAgent"
            nodeintegration
            :preload="webPreload"
        ></webview>
        <PageWebviewStatus ref="status" />
    </div>
</template>

<style lang="less" scoped>
#web {
    width: 100%;
    height: 100vh;
}
</style>
