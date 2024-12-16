<script setup lang="ts">
import {ref, toRaw} from "vue";
import {Dialog} from "../../../../lib/dialog";

const visible = ref(false)
const formData = ref({
    url: '',
    username: '',
    password: '',
    root: '',
    filePattern: '',
})
const show = async () => {
    const backupWebdav = await window.$mapi.config.get('backupWebdav', {})
    formData.value.url = backupWebdav['url'] || ''
    formData.value.username = backupWebdav['username'] || ''
    formData.value.password = backupWebdav['password'] || ''
    formData.value.root = backupWebdav['root'] || '/FocusAnyBackup/'
    formData.value.filePattern = backupWebdav['filePattern'] || 'Backup-{year}{month}{day}{hour}{minute}{second}'
    visible.value = true
}

const doSubmit = async () => {
    try {
        await window.$mapi.kvdb.testWebdav(toRaw(formData.value))
    } catch (e) {
        // console.error('testWebdav', e)
        Dialog.tipError('连接失败')
        return
    }
    await window.$mapi.config.set('backupWebdav', {
        url: formData.value.url,
        username: formData.value.username,
        password: formData.value.password,
        root: formData.value.root,
        filePattern: formData.value.filePattern,
    })
    visible.value = false
    emit('update')
}

const emit = defineEmits([
    'update'
])

defineExpose({
    show
})

</script>

<template>
    <a-modal v-model:visible="visible"
             title-align="start">
        <template #title>
            WebDav配置
        </template>
        <template #footer>
            <a-button type="primary" size="small" @click="doSubmit">
                保存
            </a-button>
            <a-button size="small" @click="visible=false">
                关闭
            </a-button>
        </template>
        <div class="h-64">
            <a-form :model="{}">
                <a-form-item label="URL">
                    <a-input v-model:model-value="formData.url" placeholder="https://"/>
                </a-form-item>
                <a-form-item label="用户名">
                    <a-input v-model:model-value="formData.username"/>
                </a-form-item>
                <a-form-item label="密码">
                    <a-input v-model:model-value="formData.password" type="password"/>
                </a-form-item>
                <a-form-item label="根目录">
                    <a-input v-model:model-value="formData.root"/>
                </a-form-item>
                <a-form-item label="文件格式">
                    <a-input v-model:model-value="formData.filePattern"/>
                    <template #help>
                        <div class="text-gray-400">
                            占位符支持 {year} {month} {day} {hour} {minute} {second}
                        </div>
                    </template>
                </a-form-item>
            </a-form>
        </div>
    </a-modal>
</template>
