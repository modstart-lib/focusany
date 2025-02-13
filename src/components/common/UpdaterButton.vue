<script setup lang="ts">
import {onMounted, ref} from "vue";
import {Dialog} from "../../lib/dialog";
import {AppConfig} from "../../config";
import {t} from "../../lang";
import {defaultResponseProcessor} from "../../lib/api";
import {VersionUtil} from "../../lib/util";

const updaterCheckLoading = ref(false)
const checkAtLaunch = ref<'yes' | 'no'>('no')

onMounted(() => {
    loadCheckAtLaunch()
})

const loadCheckAtLaunch = async () => {
    checkAtLaunch.value = await window.$mapi.updater.getCheckAtLaunch()
}

const onCheckAtLaunchChange = async (value: boolean) => {
    await window.$mapi.updater.setCheckAtLaunch(value ? 'yes' : 'no')
    await loadCheckAtLaunch()
}

const doVersionCheck = () => {
    updaterCheckLoading.value = true
    window.$mapi.updater.checkForUpdate().then(res => {
        updaterCheckLoading.value = false
        defaultResponseProcessor(res, (res: ApiResult<any>) => {
            if (!res.data.version) {
                Dialog.tipError(t('检测更新失败'))
                return
            }
            if (VersionUtil.le(res.data.version, AppConfig.version)) {
                Dialog.tipSuccess(t('已经是最新版本'))
                return
            }
            Dialog.confirm(t('发现新版本{version}，是否立即下载更新？', {version: res.data.version}))
                .then(() => {
                    window.$mapi.app.openExternalWeb(AppConfig.downloadUrl)
                })
        })
    })
}
</script>

<template>
    <div class="inline-flex items-center">
        <a-button v-if="!!AppConfig.updaterUrl"
                  size="mini"
                  class="mr-2"
                  :loading="updaterCheckLoading"
                  @click="doVersionCheck()">
            {{ $t('检测更新') }}
        </a-button>
        <a-checkbox
            :model-value="checkAtLaunch==='yes'"
            @change="onCheckAtLaunchChange as any">
            {{ $t('自动检测更新') }}
        </a-checkbox>
    </div>
</template>
