import { ChatParam, LlmChatMessage, LlmTool, LlmToolChoice, ProviderType } from '../types'
import { OpenAiModelProvider } from './driver/openai'
import { mapError } from '../../../lib/error'

const ModelProviderMap = {
    openai: OpenAiModelProvider,
}

export type ModelChatResult = {
    code: number
    msg: string
    data?: {
        content?: string
        [key: string]: any
    }
}

/**
 * Normalize a base url so that it can be safely joined with an api path.
 * - trims spaces and trailing slashes
 * - keeps a full `.../chat/completions` endpoint as is
 */
const normalizeBaseUrl = (url: string) => {
    return url.trim().replace(/\/+$/, '')
}

/**
 * Detect whether the url already contains an api version segment,
 * e.g. `/v1`, `/v4`, `/v1beta/openai`, `/v3/openai`, `/api/paas/v4`.
 */
const hasVersionSegment = (url: string) => {
    return /\/v\d+[a-z0-9]*(\/|$)/i.test(url)
}

export const ModelProvider = {
    /**
     * Build the chat completions endpoint.
     *
     * - `apiHost` (user input) takes precedence over the provider default `apiUrl`
     * - a pasted full endpoint (`.../chat/completions`) is used as is
     * - `apiPath` is the version prefix of the provider, `/v1` by default.
     *   It is skipped when the url already contains a version segment, so
     *   `https://api.siliconflow.cn/v1` does not become `/v1/v1/...`.
     */
    apiUrl(type: ProviderType, apiUrl: string, apiHost: string = '', apiPath: string = '/v1') {
        let url = normalizeBaseUrl(apiHost || '') || normalizeBaseUrl(apiUrl || '')
        if (!url) return ''
        const path = 'chat/completions'
        switch (type) {
            case 'openai':
                // A pasted full endpoint (possibly with a query string, e.g. Azure) is kept as is
                if (new RegExp(`/${path}(\\?.*)?$`, 'i').test(url)) {
                    return url
                }
                if (!apiPath || hasVersionSegment(url)) {
                    return `${url}/${path}`
                }
                return `${url}${apiPath}/${path}`
        }
        throw new Error(`Unsupported provider type: ${type}`)
    },
    async chat(
        prompt: string | LlmChatMessage[],
        chatParam: ChatParam,
        config: {
            type: ProviderType
            modelId: string
            apiUrl: string
            apiHost: string
            apiKey: string
            /** Api version prefix appended to `apiUrl`, `/v1` by default */
            apiPath?: string
            /** 是否启用模型推理（思考链）；false 时驱动层会附加关闭思考的参数 */
            reasoning?: boolean
            /** 最大返回 token 数（max_tokens） */
            maxTokens?: number
            /** 采样温度（temperature） */
            temperature?: number
            /** 核采样（top_p） */
            topP?: number
            /** 停止序列（stop） */
            stop?: string | string[]
            /** 存在惩罚（presence_penalty） */
            presencePenalty?: number
            /** 频率惩罚（frequency_penalty） */
            frequencyPenalty?: number
            /** 随机种子（seed） */
            seed?: number
            /** 工具定义列表（Function Calling，请求体 tools） */
            tools?: LlmTool[]
            /** 工具选择策略（请求体 tool_choice） */
            toolChoice?: LlmToolChoice
        },
    ): Promise<ModelChatResult> {
        let url = this.apiUrl(config.type, config.apiUrl, config.apiHost, config.apiPath)
        if (!(config.type in ModelProviderMap)) {
            return {
                code: -1,
                msg: `Unsupported provider type: ${config.type}`,
            }
        }
        const provider = new ModelProviderMap[config.type]({
            ...config,
            url,
        })
        try {
            return provider.chat(prompt, chatParam)
        } catch (e) {
            return {
                code: -1,
                msg: `Request failed: ${mapError(e)}`,
            }
        }
    },
}
