import { defineStore } from 'pinia'
import store from '../../../store/index'

import { debounce } from 'lodash-es'
import { watch } from 'vue'
import { AppConfig } from '../../../config'
import { t } from '../../../lang'
import { Dialog } from '../../../lib/dialog'
import { mapError } from '../../../lib/error'
import { ObjectUtil, StringUtil } from '../../../lib/util'
import { useUserStore } from '../../../store/modules/user'
import { SystemModels } from '../models'
import { ModelChatResult, ModelProvider } from '../provider/provider'
import { getProviderLogo, getProviderTitle, SystemProviders } from '../providers'
import { ChatParam, Model, Provider } from '../types'

const userStore = useUserStore()

export type ModelItem = {
    id: string
    providerId: string
    providerLogo: string
    providerTitle: string
    modelId: string
    modelName: string
}

watch(
    () => userStore.data,
    (newValue) => {
        model.init().then()
    },
    {
        deep: true,
    },
)

const mapModelError = (e: unknown, provider: Provider) => {
    if (provider.id === 'buildIn') {
        const msg = String(e)
        const showCharge = () => {
            $mapi.user
                .open({
                    readyParam: {
                        page: 'ChargeLLMPX',
                    },
                })
                .then()
        }
        const map = {
            insufficient_user_quota: {
                msg: t('error.energyInsufficient'),
                callback: showCharge,
            },
        }
        for (const key in map) {
            if (msg.includes(key)) {
                const error = map[key]
                if (error.callback) {
                    setTimeout(() => {
                        error.callback()
                    }, 3000)
                }
                return error.msg
            }
        }
    }
    return mapError(e)
}

export const modelStore = defineStore('model', {
    state() {
        return {
            providers: [] as Provider[],
        }
    },
    actions: {
        async init() {
            const results: Provider[] = []
            for (const providerId in SystemProviders) {
                const provider = SystemProviders[providerId]
                results.push({
                    id: providerId,
                    type: 'openai',
                    title: getProviderTitle(providerId),
                    logo: getProviderLogo(providerId),
                    isSystem: true,
                    apiUrl: provider.api.url,
                    websites: {
                        official: provider.websites?.official,
                        docs: provider.websites?.docs,
                        models: provider.websites?.models,
                    },
                    data: {
                        apiKey: '',
                        apiHost: '',
                        models: (SystemModels[providerId] || []).map((m) => {
                            return {
                                id: m.id,
                                provider: providerId,
                                name: m.name,
                                group: m.group,
                                types: ['text' as Model['types'][number]],
                                enabled: false,
                                editable: false,
                            } satisfies Model
                        }),
                        enabled: false,
                    },
                })
            }
            let buildInProviderData: Partial<Provider['data']> | null = null
            const storageData = await $mapi.storage.read('models')
            if (storageData) {
                if (storageData.userProviders) {
                    storageData.userProviders.forEach((provider) => {
                        results.unshift({
                            id: provider.id,
                            type: provider.type,
                            title: provider.title,
                            logo: null,
                            isSystem: false,
                            apiUrl: '',
                            websites: {
                                official: '',
                                docs: '',
                                models: '',
                            },
                            data: {
                                apiKey: '',
                                apiHost: '',
                                models: [],
                                enabled: false,
                            },
                        })
                    })
                }
                if (storageData.providerData) {
                    buildInProviderData = storageData.providerData['buildIn'] || null
                    for (const providerId in storageData.providerData) {
                        const provider = results.find((p) => p.id === providerId)
                        if (provider) {
                            provider.data.apiKey = storageData.providerData[providerId].apiKey || ''
                            provider.data.apiHost = storageData.providerData[providerId].apiHost
                            ;(storageData.providerData[providerId].models || []).forEach((model) => {
                                const existingModel = provider.data.models.find((m) => m.id === model.id)
                                if (existingModel) {
                                    existingModel.name = model.name
                                    existingModel.group = model.group
                                    existingModel.types = model.types
                                    existingModel.enabled = model.enabled || false
                                } else {
                                    provider.data.models.push({
                                        id: model.id,
                                        provider: providerId,
                                        name: model.name,
                                        group: model.group,
                                        types: ['text'],
                                        enabled: model.enabled || false,
                                        editable: true,
                                    })
                                }
                            })
                            provider.data.enabled = storageData.providerData[providerId].enabled || false
                        }
                    }
                }
            }
            this.providers = results
            await this.refreshBuildIn(buildInProviderData)
        },
        async enabledModels(): Promise<ModelItem[]> {
            const results: ModelItem[] = []
            this.providers.forEach((provider) => {
                if (provider.data.enabled) {
                    provider.data.models.forEach((model) => {
                        if (model.enabled) {
                            results.push({
                                id: provider.id + '|' + model.id,
                                providerId: provider.id,
                                providerLogo: provider.logo || '',
                                providerTitle: provider.title || '',
                                modelId: model.id,
                                modelName: model.name,
                            })
                        }
                    })
                }
            })
            return results
        },
        async refreshBuildIn(buildInProviderData?: Partial<Provider['data']> | null) {
            if (userStore.data && userStore.data.llmpx && userStore.data.llmpx.models) {
                const llmpx = userStore.data.llmpx
                if (!llmpx.apiUrl) {
                    return
                }
                const buildInProvider = this.providers.find((p) => p.id === 'buildIn')
                if (!buildInProvider) {
                    const models: Model[] = []
                    for (const m of llmpx.models) {
                        const modelId = typeof m === 'string' ? m : m.name
                        const modelRate = typeof m === 'string' ? undefined : m.rate
                        const savedModel = (buildInProviderData?.models || []).find((sm) => sm.id === modelId)
                        models.push({
                            id: modelId,
                            provider: 'buildIn',
                            name: modelId,
                            group: 'Default',
                            types: ['text'],
                            enabled: savedModel ? savedModel.enabled : true,
                            editable: false,
                            rate: modelRate,
                        })
                    }
                    // console.log("model.init.buildIn", JSON.stringify({llmpx}, null, 2));
                    let enabled = true
                    if (buildInProviderData && 'enabled' in buildInProviderData) {
                        enabled = buildInProviderData.enabled ?? true
                    }
                    console.log('model.init.buildIn', { enabled, buildInProviderData })
                    this.providers.unshift({
                        id: 'buildIn',
                        type: 'openai',
                        title: getProviderTitle('buildIn'),
                        logo: getProviderLogo('buildIn'),
                        isSystem: true,
                        apiUrl: llmpx.apiUrl,
                        websites: {
                            official: AppConfig.website,
                            docs: AppConfig.website,
                            models: AppConfig.website,
                        },
                        data: {
                            apiKey: llmpx.apiKey,
                            apiHost: '',
                            models: models,
                            enabled: enabled,
                        },
                    })
                } else {
                    buildInProvider.data.apiKey = llmpx.apiKey
                    for (const m of llmpx.models) {
                        const modelId = typeof m === 'string' ? m : m.name
                        const modelRate = typeof m === 'string' ? undefined : m.rate
                        const existingModel = buildInProvider.data.models.find((em) => em.id === modelId)
                        if (existingModel) {
                            existingModel.rate = modelRate
                        } else {
                            buildInProvider.data.models.push({
                                id: modelId,
                                provider: 'buildIn',
                                name: modelId,
                                group: 'Default',
                                types: ['text'],
                                enabled: true,
                                editable: false,
                                rate: modelRate,
                            })
                        }
                    }
                }
            }
        },
        async add(provider: Partial<Provider>) {
            const p: Provider = {
                id: provider.id || StringUtil.random(8),
                type: provider.type || 'openai',
                title: provider.title || '',
                logo: null,
                isSystem: false,
                apiUrl: '',
                websites: {
                    official: '',
                    docs: '',
                    models: '',
                },
                data: {
                    apiKey: '',
                    apiHost: '',
                    models: [],
                    enabled: false,
                },
            }
            this.providers.unshift(p)
            await this.sync()
        },
        async edit(provider: Partial<Provider>) {
            const p = this.providers.find((p) => p.id === provider.id)
            if (p) {
                if ('title' in provider) {
                    p.title = provider.title || ''
                }
                if ('type' in provider) {
                    p.type = provider.type || 'openai'
                }
                if (provider.data) {
                    if ('apiKey' in provider.data) {
                        p.data.apiKey = provider.data.apiKey
                    }
                    if ('apiHost' in provider.data) {
                        p.data.apiHost = provider.data.apiHost
                    }
                    if ('enabled' in provider.data) {
                        p.data.enabled = provider.data.enabled
                    }
                }
                await this.sync()
            }
        },
        async test(providerId: string, modelId: string) {
            await this.refreshBuildIn()
            const provider = this.providers.find((p) => p.id === providerId)
            if (!provider) {
                return
            }
            const m = provider.data.models.find((m) => m.id === modelId)
            if (!m) {
                return
            }
            Dialog.loadingOn(t('common.testing'))
            try {
                const ret = await ModelProvider.chat(
                    t('model.testPrompt'),
                    {
                        systemPrompt: null,
                    },
                    {
                        type: provider.type,
                        modelId: m.id,
                        apiUrl: provider.apiUrl,
                        apiHost: provider.data.apiHost,
                        apiKey: provider.data.apiKey,
                    },
                )
                if (ret.code) {
                    throw ret.msg
                }
                Dialog.tipSuccess(t('common.testSuccess'))
            } catch (e) {
                Dialog.tipError(t('common.testFailed') + ' ' + mapModelError(e, provider))
            } finally {
                Dialog.loadingOff()
            }
        },
        async chat(
            providerId: string,
            modelId: string,
            prompt: string,
            chatParam: ChatParam,
            option?: {
                loading: boolean
            },
        ): Promise<ModelChatResult> {
            await this.refreshBuildIn()
            if (!providerId || !modelId) {
                Dialog.tipError(t('hint.selectModel'))
                return { code: -1, msg: t('hint.selectModel') }
            }
            option = Object.assign(
                {
                    loading: false,
                },
                option,
            )
            const provider = this.providers.find((p) => p.id === providerId)
            // console.log("provider.chat", JSON.stringify({provider}, null, 2));
            if (!provider) {
                return { code: -1, msg: 'provider not found' }
            }
            if (provider.id === 'buildIn' && !provider.apiUrl) {
                const msg = t('error.energyInsufficient')
                Dialog.tipError(msg)
                setTimeout(() => {
                    $mapi.user.open({ readyParam: { page: 'ChargeLLMPX' } }).then()
                }, 1500)
                return { code: -1, msg }
            }
            const m = provider.data.models.find((m) => m.id === modelId)
            if (!m) {
                return { code: -1, msg: 'model not found' }
            }
            if (option.loading) {
                Dialog.loadingOn()
            }
            try {
                return await ModelProvider.chat(prompt, chatParam, {
                    type: provider.type,
                    modelId: m.id,
                    apiUrl: provider.apiUrl,
                    apiHost: provider.data.apiHost,
                    apiKey: provider.data.apiKey,
                })
            } catch (e) {
                return { code: -1, msg: mapModelError(e, provider) }
            } finally {
                if (option.loading) {
                    Dialog.loadingOff()
                }
            }
        },
        async change(
            providerId: string,
            key: '' | 'data.apiKey' | 'data.apiHost' | 'data.enabled',
            value: string | boolean,
        ) {
            const provider = model.providers.find((p) => p.id === providerId)
            if (!provider) {
                return
            }
            const keys = key.split('.')
            let obj = provider
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]]
            }
            const lastKey = keys[keys.length - 1]
            if (obj && lastKey in obj) {
                obj[lastKey] = value
            }
            await this.sync()
        },
        async modelAdd(providerId: string, model: Partial<Model>) {
            const provider = this.providers.find((p) => p.id === providerId)
            if (!provider) {
                return
            }
            const m: Model = {
                id: model.id || StringUtil.random(8),
                provider: providerId,
                name: model.name || '',
                group: model.group || '',
                types: model.types || ['text'],
                enabled: true,
                editable: model.editable ?? true,
            }
            provider.data.models.unshift(m)
            await this.sync()
        },
        async modelDelete(providerId: string, modelId: string) {
            const provider = this.providers.find((p) => p.id === providerId)
            if (!provider) {
                return
            }
            const m = provider.data.models.find((m) => m.id === modelId)
            if (m) {
                provider.data.models.splice(provider.data.models.indexOf(m), 1)
            }
            await this.sync()
        },
        async modelEdit(providerId: string, model: Partial<Model>) {
            const provider = this.providers.find((p) => p.id === providerId)
            if (!provider) {
                return
            }
            const m = provider.data.models.find((m) => m.id === model.id)
            if (m) {
                if ('name' in model) {
                    m.name = model.name || ''
                }
                if ('group' in model) {
                    m.group = model.group || ''
                }
                if ('types' in model) {
                    m.types = model.types || ['text']
                }
                if ('enabled' in model) {
                    m.enabled = model.enabled as boolean
                }
            }
            await this.sync()
        },
        async changeModel(providerId: string, modelId: string, key: 'enabled', value: boolean) {
            const provider = this.providers.find((p) => p.id === providerId)
            if (!provider) {
                return
            }
            const m = provider.data.models.find((m) => m.id === modelId)
            if (m) {
                m[key] = value
            }
            await this.sync()
        },
        sync: debounce(async () => {
            const providerData = {}
            model.providers.forEach((provider) => {
                providerData[provider.id] = ObjectUtil.clone(provider.data)
                if (provider.id === 'buildIn') {
                    providerData[provider.id].apiKey = ''
                }
            })
            const userProviders = model.providers.filter((provider) => !provider.isSystem)
            await $mapi.storage.write('models', ObjectUtil.clone({ providerData, userProviders }))
        }, 200),
    },
})

export const model = modelStore(store)
model.init().then()

export const useModelStore = () => {
    return model
}
