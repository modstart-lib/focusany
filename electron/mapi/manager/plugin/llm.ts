// @ts-ignore
import { Model, Provider } from '../../../../src/module/Model/types'
// @ts-ignore
import { getProviderLogo, getProviderTitle, SystemProviders } from '../../../../src/module/Model/providers'
// @ts-ignore
import { AppConfig } from '../../../../src/config'
import { SystemModels } from '../../../../src/module/Model/models'
import { ModelProvider } from '../../../../src/module/Model/provider/provider'
import { LlmChatMessage, LlmTool, LlmToolChoice } from '../../../../src/module/Model/types'
import StorageMain from '../../storage/main'
import User from '../../user/main'

const listProviders = async (): Promise<Provider[]> => {
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
                        types: ['text'],
                        caps: (m as any).caps,
                        enabled: false,
                    } as any
                }),
                enabled: false,
            },
        })
    }
    const storageData = await StorageMain.read('models', [])
    let buildInProviderData: any = null
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
                    provider.apiUrl = storageData.providerData[providerId].apiUrl || provider.apiUrl || ''
                    provider.data.apiKey = storageData.providerData[providerId].apiKey || ''
                    provider.data.apiHost = storageData.providerData[providerId].apiHost
                    ;(storageData.providerData[providerId].models || []).forEach((model) => {
                        const existingModel = provider.data.models.find((m) => m.id === model.id)
                        if (existingModel) {
                            existingModel.name = model.name
                            existingModel.group = model.group
                            existingModel.types = model.types
                            existingModel.caps = model.caps || existingModel.caps
                            existingModel.enabled = model.enabled || false
                        } else {
                            provider.data.models.push({
                                id: model.id,
                                provider: providerId,
                                name: model.name,
                                group: model.group,
                                types: ['text'],
                                caps: model.caps || {},
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
    const user = await User.get()
    if (user.data && user.data.llmpx && user.data.llmpx.models) {
        const llmpx = user.data.llmpx
        if (!llmpx.apiUrl) {
            return results
        }
        const models: Model[] = []
        for (const m of llmpx.models) {
            const modelId = typeof m === 'string' ? m : m.name
            const modelLabel = typeof m === 'string' ? undefined : m.label
            const modelRate = typeof m === 'string' ? undefined : m.rate
            const savedModel = (buildInProviderData?.models || []).find((sm) => sm.id === modelId)
            models.push({
                id: modelId,
                provider: 'buildIn',
                name: modelId,
                label: modelLabel,
                group: 'Default',
                types: ['text'],
                caps: (m as any).caps || {},
                enabled: savedModel ? savedModel.enabled : true,
                editable: false,
                rate: modelRate,
            } as any)
        }
        let enabled = true
        if (buildInProviderData && 'enabled' in buildInProviderData) {
            enabled = buildInProviderData.enabled
        }
        results.unshift({
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
    }
    return results
}

export const listModels = async () => {
    const providers = await listProviders()
    const results: {
        providerId: string
        providerLogo: string
        providerTitle: string
        modelId: string
        modelName: string
        modelLabel?: string
        /** 模型能力：vision 视觉识别 / tools 工具调用 */
        modelCaps?: {
            vision?: boolean
            tools?: boolean
        }
    }[] = []
    for (const provider of providers) {
        if (!provider.data || !provider.data.enabled || !provider.data.models) {
            continue
        }
        for (const model of provider.data.models) {
            if (model.enabled) {
                results.push({
                    providerId: provider.id,
                    providerLogo: provider.logo || '',
                    providerTitle: provider.title,
                    modelId: model.id,
                    modelName: model.name,
                    modelLabel: model.label,
                    modelCaps: model.caps || {},
                })
            }
        }
    }
    return results
}

export type LlmReasoning = boolean | { enabled?: boolean; effort?: 'low' | 'medium' | 'high' }

export type LlmChatCallInfo = {
    systemPrompt?: string
    prompt?: string
    /** 完整消息列表（多轮/自定义 role）。content 支持纯文本或含图片（image_url）的多模态数组 */
    messages?: LlmChatMessage[]
    /**
     * 推理（思考链）控制。通用布尔或对象：
     *  - false：关闭（驱动层按模型格式自动适配：DeepSeek 系 thinking.disabled、OpenAI o 系 reasoning_effort=low）
     *  - true：默认开启
     *  - { enabled, effort }：enabled=false 关闭；effort 设置思考强度（OpenAI o 系）
     */
    reasoning?: LlmReasoning
    maxTokens?: number
    temperature?: number
    topP?: number
    stop?: string | string[]
    presencePenalty?: number
    frequencyPenalty?: number
    seed?: number
    /** 工具定义列表（Function Calling，仅支持工具调用的模型可用） */
    tools?: LlmTool[]
    /** 工具选择策略：auto/none/required 或指定具体函数 */
    toolChoice?: LlmToolChoice
}

export const modelChat = async (
    providerId: string,
    modelId: string,
    callInfo: LlmChatCallInfo,
): Promise<{
    code: number
    msg: string
    data?: {
        message: string
        /** 工具调用结果（模型请求了函数调用时返回） */
        toolCalls?: Array<{
            id?: string
            type?: string
            name?: string
            arguments?: string
        }>
    }
}> => {
    const providers = await listProviders()
    const provider = providers.find((p) => p.id === providerId)
    if (!provider) {
        throw new Error(`Provider not found: ${providerId}`)
    }
    const model = provider.data.models.find((m) => m.id === modelId)
    if (!model || !model.enabled) {
        throw new Error(`Model not found or not enabled: ${modelId}`)
    }
    // prompt 与 messages 至少提供其一；systemPrompt 单独提供无效
    let promptArg: string | LlmChatMessage[]
    if (Array.isArray(callInfo.messages) && callInfo.messages.length) {
        promptArg = [...callInfo.messages]
        if (callInfo.systemPrompt) {
            promptArg = [{ role: 'system', content: callInfo.systemPrompt }, ...promptArg]
        }
    } else {
        if (!callInfo.prompt || typeof callInfo.prompt !== 'string') {
            throw new Error('prompt or messages is required')
        }
        promptArg = callInfo.prompt
    }
    const res = await ModelProvider.chat(
        promptArg,
        { systemPrompt: callInfo.systemPrompt || null },
        {
            type: provider.type,
            modelId: model.id,
            apiUrl: provider.apiUrl,
            apiHost: provider.data.apiHost,
            apiKey: provider.data.apiKey,
            // 默认开启推理；reasoning=false 关闭，或 {enabled:false} / {effort} 精细控制
            reasoning: callInfo.reasoning,
            maxTokens: callInfo.maxTokens,
            temperature: callInfo.temperature,
            topP: callInfo.topP,
            stop: callInfo.stop,
            presencePenalty: callInfo.presencePenalty,
            frequencyPenalty: callInfo.frequencyPenalty,
            seed: callInfo.seed,
            tools: callInfo.tools,
            toolChoice: callInfo.toolChoice,
        },
    )
    if (res.code) {
        return {
            code: -1,
            msg: res.msg,
        }
    }
    return {
        code: 0,
        msg: 'ok',
        data: {
            message: res.data?.content || '',
            toolCalls: res.data?.toolCalls,
        },
    }
}

/** 从 LLM 文本中提取 JSON：剥离 ```json 代码块与前后杂文，找首个 { 到最后一个 }。 */
export function extractJSON(text: string): any {
    if (!text || typeof text !== 'string') throw new Error('AI 返回内容为空')
    let t = text.trim()
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fence) t = fence[1].trim()
    const s = t.indexOf('{')
    const e = t.lastIndexOf('}')
    if (s < 0 || e <= s) throw new Error('返回内容中没有 JSON 对象')
    return JSON.parse(t.slice(s, e + 1))
}

/**
 * modelChatJson — 返回解析好的 JSON（而非字符串）。内部处理大模型常见问题：
 *  ```json 代码块包裹、前后杂文、截断导致的 JSON 不完整。
 */
export const modelChatJson = async (
    providerId: string,
    modelId: string,
    callInfo: LlmChatCallInfo,
): Promise<{
    code: number
    msg: string
    data?: {
        json: any
        message: string
    }
}> => {
    const res = await modelChat(providerId, modelId, callInfo)
    if (res.code !== 0) {
        return { code: res.code, msg: res.msg, data: { message: res.data?.message || '' } }
    }
    const content = res.data?.message || ''
    try {
        const json = extractJSON(content)
        return { code: 0, msg: 'ok', data: { json, message: content } }
    } catch (e) {
        const msg = `AI 返回不是合法 JSON：${String((e as Error)?.message || e)}。输出可能被 max_tokens 截断——请调大 maxTokens 或简化要求/换更大上下文模型。`
        return { code: -1, msg, data: { message: content } }
    }
}
