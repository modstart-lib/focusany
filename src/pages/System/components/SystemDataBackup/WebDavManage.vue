<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { t } from '../../../../lang'
import { Dialog } from '../../../../lib/dialog'
import { TimeUtil } from '../../../../lib/util'
import WebDavManageSettingDialog from './WebDavManageSettingDialog.vue'

const type = ref('backup')
const settingDialog = ref<InstanceType<typeof WebDavManageSettingDialog> | null>(null)
const backupWebDavHasConfig = ref(false)
const loading = ref(false)
const restoreRecords = ref<string[]>([])
const restoreRecordSelect = ref<string | null>(null)

onMounted(() => {
    doLoad()
})

watch(
    () => type.value,
    () => {
        if (type.value === 'restore') {
            doLoadRestoreRecords()
        }
    },
)

const doLoad = async () => {
    const backupWebdav = await window.$mapi.config.get('backupWebdav', {})
    backupWebDavHasConfig.value = !!backupWebdav['url']
}
const doLoadRestoreRecords = async () => {
    const backupWebdav = await window.$mapi.config.get('backupWebdav', {})
    let root = backupWebdav.root || '/FocusAnyBackup/'
    const records = await window.$mapi.kvdb.listWebDav(root, backupWebdav)
    if (records.length > 0) {
        restoreRecordSelect.value = records[0]
    }
    restoreRecords.value = records
}

const doBackup = async () => {
    if (loading.value) {
        return
    }
    const backupWebdav = await window.$mapi.config.get('backupWebdav', {})
    let file = backupWebdav.filePattern || 'Backup-{year}{month}{day}{hour}{minute}{second}'
    let root = backupWebdav.root || '/FocusAnyBackup/'
    file = TimeUtil.replacePattern(file)
    root = root.replace(/\/$/, '')
    file = `${root}/${file}.backup`
    Dialog.loadingOn(t('backup.backingUp'))
    loading.value = true
    try {
        await window.$mapi.kvdb.dumpToWebDav(file, backupWebdav)
        Dialog.tipSuccess(t('backup.backupSuccess'))
    } catch (e) {
        Dialog.tipError(t('backup.backupFailed'))
    } finally {
        loading.value = false
        Dialog.loadingOff()
    }
}

const doRestore = async () => {
    if (loading.value) {
        return
    }
    if (!restoreRecordSelect.value) {
        Dialog.tipError(t('backup.selectRestoreFile'))
        return
    }
    const backupWebdav = await window.$mapi.config.get('backupWebdav', {})
    let root = backupWebdav.root || '/FocusAnyBackup/'
    root = root.replace(/\/$/, '') + '/'
    let file = restoreRecordSelect.value
    file = root + file
    Dialog.loadingOn(t('backup.restoring'))
    loading.value = true
    try {
        await window.$mapi.kvdb.importFromWebDav(file, backupWebdav)
        Dialog.tipSuccess(t('backup.restoreSuccess'))
    } catch (e) {
        Dialog.tipError(t('backup.restoreFailed'))
    } finally {
        loading.value = false
        Dialog.loadingOff()
    }
}

const emit = defineEmits(['update'])
</script>

<template>
    <div class="flex">
        <div class="flex-grow">
            <a-radio-group v-model:model-value="type">
                <a-radio value="backup">{{ $t('backup.uploadToCloud') }}</a-radio>
                <a-radio value="restore">{{ $t('backup.restoreFromCloud') }}</a-radio>
            </a-radio-group>
        </div>
        <div>
            <a-button v-if="backupWebDavHasConfig" size="small" @click="settingDialog?.show()">
                <template #icon>
                    <icon-settings />
                </template>
                {{ $t('backup.webdavConfig') }}
            </a-button>
        </div>
    </div>
    <div class="py-3" v-if="!backupWebDavHasConfig">
        <div
            class="bg-gray-100 dark:bg-gray-700 rounded-lg text-center p-4 cursor-pointer"
            @click="settingDialog?.show()"
        >
            <div>
                <icon-cloud class="text-2xl" />
            </div>
            <div>{{ $t('backup.notConfigured') }}</div>
        </div>
    </div>
    <div class="py-3" v-if="backupWebDavHasConfig && type === 'backup'">
        <div
            class="bg-gray-100 dark:bg-gray-700 rounded-lg text-center p-4 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
            @click="doBackup"
        >
            <div>
                <icon-cloud class="text-2xl" />
            </div>
            <div>{{ $t('backup.startBackup') }}</div>
        </div>
    </div>
    <div class="py-3" v-if="backupWebDavHasConfig && type === 'restore'">
        <a-form :model="{}" layout="vertical">
            <a-form-item>
                <a-select v-model="restoreRecordSelect as any" style="width: 100%">
                    <a-option v-for="item in restoreRecords" :key="item" :value="item">
                        {{ item }}
                    </a-option>
                </a-select>
                <template #label>
                    <div class="flex items-center">
                        <div class="mr-2">{{ $t('backup.selectFile') }}</div>
                        <a-button size="small" @click="doLoadRestoreRecords">
                            <template #icon>
                                <icon-refresh />
                            </template>
                        </a-button>
                    </div>
                </template>
            </a-form-item>
            <a-form-item>
                <a-button type="primary" @click="doRestore"> {{ $t('backup.startRestore') }} </a-button>
            </a-form-item>
        </a-form>
    </div>
    <WebDavManageSettingDialog ref="settingDialog" @update="doLoad()" />
</template>

<style scoped lang="less"></style>
