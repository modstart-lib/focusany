import { Model } from '../types'

export const systemGlobalModels: Record<string, Partial<Model>[]> = {
    openai: [
        {
            id: 'gpt-6-astra',
            provider: 'openai',
            name: 'GPT-6 Astra',
            group: 'GPT-6',
            caps: { vision: true, tools: true },
        },
        {
            id: 'gpt-6.1-sol',
            provider: 'openai',
            name: 'GPT-6.1 Sol',
            group: 'GPT-6',
            caps: { vision: true, tools: true },
        },
        {
            id: 'gpt-6-luna',
            provider: 'openai',
            name: 'GPT-6 Luna',
            group: 'GPT-6',
            caps: { vision: true, tools: true },
        },
        {
            id: 'gpt-4o',
            provider: 'openai',
            name: 'GPT-4o',
            group: 'GPT 4o',
            caps: { vision: true, tools: true },
        },
        {
            id: 'gpt-4o-mini',
            provider: 'openai',
            name: 'GPT-4o-mini',
            group: 'GPT 4o',
            caps: { vision: true, tools: true },
        },
        {
            id: 'o1-mini',
            provider: 'openai',
            name: 'o1-mini',
            group: 'o1',
            caps: { tools: true },
        },
    ],

    gemini: [
        {
            id: 'gemini-3.8-flash',
            provider: 'gemini',
            name: 'Gemini 3.8 Flash',
            group: 'Gemini 3.8',
            caps: { vision: true, tools: true },
        },
        {
            id: 'gemini-3.6-flash',
            provider: 'gemini',
            name: 'Gemini 3.6 Flash',
            group: 'Gemini 3.6',
            caps: { vision: true, tools: true },
        },
        {
            id: 'gemini-3.5-flash-lite',
            provider: 'gemini',
            name: 'Gemini 3.5 Flash-Lite',
            group: 'Gemini 3.5',
            caps: { vision: true, tools: true },
        },
        {
            id: 'gemini-2.5-flash',
            provider: 'gemini',
            name: 'Gemini 2.5 Flash',
            group: 'Gemini 2.5',
            caps: { vision: true, tools: true },
        },
        {
            id: 'gemini-2.5-pro',
            provider: 'gemini',
            name: 'Gemini 2.5 Pro',
            group: 'Gemini 2.5',
            caps: { vision: true, tools: true },
        },
    ],

    anthropic: [
        {
            id: 'claude-opus-4-6',
            provider: 'anthropic',
            name: 'Claude Opus 4.6',
            group: 'Claude 4.6',
            caps: { vision: true, tools: true },
        },
        {
            id: 'claude-sonnet-4-6',
            provider: 'anthropic',
            name: 'Claude Sonnet 4.6',
            group: 'Claude 4.6',
            caps: { vision: true, tools: true },
        },
        {
            id: 'claude-haiku-4-5',
            provider: 'anthropic',
            name: 'Claude Haiku 4.5',
            group: 'Claude 4.5',
            caps: { vision: true, tools: true },
        },
        {
            id: 'claude-sonnet-4-5',
            provider: 'anthropic',
            name: 'Claude Sonnet 4.5',
            group: 'Claude 4.5',
            caps: { vision: true, tools: true },
        },
        {
            id: 'claude-opus-4-5',
            provider: 'anthropic',
            name: 'Claude Opus 4.5',
            group: 'Claude 4.5',
            caps: { vision: true, tools: true },
        },
    ],

    grok: [
        {
            id: 'grok-beta',
            provider: 'grok',
            name: 'Grok Beta',
            group: 'Grok',
            caps: { tools: true },
        },
        {
            id: 'grok-vision-beta',
            provider: 'grok',
            name: 'Grok Vision Beta',
            group: 'Grok',
            caps: { vision: true, tools: true },
        },
    ],

    mistral: [
        {
            id: 'pixtral-12b-2409',
            provider: 'mistral',
            name: 'Pixtral 12B [Free]',
            group: 'Pixtral',
        },
        {
            id: 'pixtral-large-latest',
            provider: 'mistral',
            name: 'Pixtral Large',
            group: 'Pixtral',
            caps: { vision: true },
        },
        {
            id: 'ministral-3b-latest',
            provider: 'mistral',
            name: 'Mistral 3B [Free]',
            group: 'Mistral Mini',
        },
        {
            id: 'ministral-8b-latest',
            provider: 'mistral',
            name: 'Mistral 8B [Free]',
            group: 'Mistral Mini',
        },
        {
            id: 'codestral-latest',
            provider: 'mistral',
            name: 'Mistral Codestral',
            group: 'Mistral Code',
        },
        {
            id: 'mistral-large-latest',
            provider: 'mistral',
            name: 'Mistral Large',
            group: 'Mistral Chat',
        },
        {
            id: 'mistral-small-latest',
            provider: 'mistral',
            name: 'Mistral Small',
            group: 'Mistral Chat',
        },
        {
            id: 'open-mistral-nemo',
            provider: 'mistral',
            name: 'Mistral Nemo',
            group: 'Mistral Chat',
        },
    ],

    nvidia: [
        {
            id: '01-ai/yi-large',
            provider: 'nvidia',
            name: 'yi-large',
            group: 'Yi',
        },
        {
            id: 'meta/llama-3.1-405b-instruct',
            provider: 'nvidia',
            name: 'llama-3.1-405b-instruct',
            group: 'llama-3.1',
        },
    ],

    groq: [
        {
            id: 'llama3-8b-8192',
            provider: 'groq',
            name: 'LLaMA3 8B',
            group: 'Llama3',
        },
        {
            id: 'llama3-70b-8192',
            provider: 'groq',
            name: 'LLaMA3 70B',
            group: 'Llama3',
        },
        {
            id: 'mistral-saba-24b',
            provider: 'groq',
            name: 'Mistral Saba 24B',
            group: 'Mistral',
        },
        {
            id: 'gemma-9b-it',
            provider: 'groq',
            name: 'Gemma 9B',
            group: 'Gemma',
        },
    ],

    perplexity: [
        {
            id: 'sonar-reasoning-pro',
            provider: 'perplexity',
            name: 'sonar-reasoning-pro',
            group: 'Sonar',
        },
        {
            id: 'sonar-reasoning',
            provider: 'perplexity',
            name: 'sonar-reasoning',
            group: 'Sonar',
        },
        {
            id: 'sonar-pro',
            provider: 'perplexity',
            name: 'sonar-pro',
            group: 'Sonar',
        },
        {
            id: 'sonar',
            provider: 'perplexity',
            name: 'sonar',
            group: 'Sonar',
        },
    ],
}
