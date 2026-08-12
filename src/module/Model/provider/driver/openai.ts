import { ModelChatResult } from '../provider'
import { ChatParam, ProviderType } from '../../types'
import { AbstractModelProvider } from './base'

export class OpenAiModelProvider extends AbstractModelProvider {
    constructor(config: {
        type: ProviderType
        url: string
        apiUrl: string
        apiHost: string
        apiKey: string
        [p: string]: any
    }) {
        super(config)
    }

    async chat(
        prompt: string | Array<{ role: string; content: string }>,
        chatParam: ChatParam,
    ): Promise<ModelChatResult> {
        // this.config.url =  'http://localhost:3000/v1/chat/completions';
        // this.config.apiKey = '';
        chatParam = Object.assign(
            {
                systemPrompt: null,
            },
            chatParam,
        )
        // prompt 为字符串 → 构造 [system?, user]；为数组 → 直接使用（上层已含 system）
        let messages: any[]
        if (Array.isArray(prompt)) {
            messages = prompt.map((m) => ({ role: m.role, content: m.content }))
        } else {
            messages = []
            if (chatParam.systemPrompt) {
                messages.push({ role: 'system', content: chatParam.systemPrompt })
            }
            messages.push({ role: 'user', content: prompt })
        }
        const body: Record<string, any> = {
            model: this.config.modelId,
            messages: messages,
        }
        // reasoning 控制：通用布尔/对象 → 按模型格式自动适配
        //  - DeepSeek/通义等国产（含 focusany-default = deepseek-v4 格式）：thinking:{type:"disabled"} + enable_thinking:false
        //  - OpenAI o1/o3/o4 系列：无法完全关闭思考，用 reasoning_effort=low 尽量轻量
        //  - { effort: 'high' } 等：设置思考强度（o 系）
        const reasoning = this.config.reasoning
        const rObj = typeof reasoning === 'object' && reasoning !== null ? reasoning : null
        const reasoningOff = reasoning === false || (rObj && rObj.enabled === false)
        const effort = rObj?.effort
        const modelName = String(this.config.modelId || '').toLowerCase()
        const isOpenAIReasoning = /^(o1|o3|o4)[-.]/.test(modelName)
        if (reasoningOff) {
            if (isOpenAIReasoning) {
                body.reasoning_effort = 'low'
            } else {
                // DeepSeek 新版 API 认 thinking；老版认 enable_thinking，一并附上
                body.enable_thinking = false
                body.thinking = { type: 'disabled' }
            }
        } else if (effort) {
            body.reasoning_effort = effort
        }
        // 常见采样参数：仅当显式传入时附加（OpenAI 兼容 snake_case 命名）
        if (typeof this.config.maxTokens === 'number') body.max_tokens = this.config.maxTokens
        if (typeof this.config.temperature === 'number') body.temperature = this.config.temperature
        if (typeof this.config.topP === 'number') body.top_p = this.config.topP
        if (this.config.stop !== undefined) body.stop = this.config.stop
        if (typeof this.config.presencePenalty === 'number') body.presence_penalty = this.config.presencePenalty
        if (typeof this.config.frequencyPenalty === 'number') body.frequency_penalty = this.config.frequencyPenalty
        if (typeof this.config.seed === 'number') body.seed = this.config.seed
        const response = await fetch(this.config.url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })
        if (!response.ok) {
            const error = await response.text()
            throw `Request failed: ${response.status}\n${error}`
        }
        // check if is json
        if (!response.headers.get('content-type')?.includes('application/json')) {
            const error = await response.text()
            throw `Response is not json: ${response.status}\n${error}`
        }
        const data = await response.json()
        try {
            const message = data.choices[0].message
            const content = message.content
            // 诊断：即便 reasoning=false，模型仍可能进入思考（网关/模型忽略参数）——
            // 此时 content 常为空、token 全耗在 reasoning_content，直接给调用方可读错误。
            if (
                this.config.reasoning === false &&
                (typeof content !== 'string' || !content.trim()) &&
                message.reasoning_content
            ) {
                throw `Model is still reasoning (reasoning_content present, content empty) — the endpoint ignored "enable_thinking:false/thinking.disabled". Try a non-thinking model (e.g. gpt/gemini) or the provider's reasoning toggle.`
            }
            return {
                code: 0,
                msg: 'ok',
                data: {
                    content,
                },
            }
        } catch (e) {
            if (typeof e === 'string') throw e
            throw `Invalid response format: ${JSON.stringify(data)}`
        }
    }
}
