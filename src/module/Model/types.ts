export type ProviderType = 'openai' // | 'anthropic' | 'gemini' | 'qwenlm' | 'azure-openai'

export type ModelType = 'text' // | 'vision' | 'embedding' | 'reasoning' | 'function_calling'

export type ModelCaps = {
    vision?: boolean
    tools?: boolean
}

export type Model = {
    id: string
    provider: string
    name: string
    label?: string
    group: string
    types: ModelType[]
    caps?: ModelCaps
    enabled: boolean
    editable: boolean
    rate?: number
}

export type Provider = {
    id: string
    type: ProviderType
    logo: string | null
    title: string
    isSystem: boolean
    apiUrl: string
    websites: {
        official: string
        docs: string
        models: string
    }
    data: {
        apiKey: string
        apiHost: string
        models: Model[]
        enabled: boolean
    }
    runtime?: {}
}

export type ChatParam = {
    systemPrompt: string | null
}

/** 多模态消息内容片段：纯文本或图片（OpenAI 兼容格式） */
export type LlmMessageContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }

/** 聊天消息：content 支持纯文本或含图片的多模态片段数组 */
export type LlmChatMessage = {
    role: string
    content: string | LlmMessageContentPart[]
}

/** 工具定义（Function Calling，OpenAI 兼容格式） */
export type LlmTool = {
    type: 'function'
    function: {
        name: string
        description?: string
        parameters?: Record<string, any>
    }
}

/** 工具选择策略：auto/none/required 或指定具体函数 */
export type LlmToolChoice = 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
