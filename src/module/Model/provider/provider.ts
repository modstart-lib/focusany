import {ProviderType} from "../types";
import {OpenAiModelProvider} from "./driver/openai";
import {mapError} from "../../../lib/error";

const ModelProviderMap = {
    openai: OpenAiModelProvider,
};

export type ModelChatResult = {
    code: number;
    msg: string;
    data?: {
        content?: string;
        [key: string]: any;
    };
};

export const ModelProvider = {
    apiUrl(type: ProviderType, apiUrl: string, apiHost: string = "") {
        let url = apiUrl;
        if (apiHost) {
            url = apiHost;
        }
        switch (type) {
            case "openai":
                url = url.replace(/\/v1\/chat\/completions$/, "");
                return `${url}/v1/chat/completions`;
        }
        throw new Error(`Unsupported provider type: ${type}`);
    },
    async chat(
        prompt: string,
        config: {
            type: ProviderType;
            modelId: string;
            apiUrl: string;
            apiHost: string;
            apiKey: string;
        }
    ): Promise<ModelChatResult> {
        const url = this.apiUrl(config.type, config.apiUrl, config.apiHost);
        if (!(config.type in ModelProviderMap)) {
            return {
                code: -1,
                msg: `Unsupported provider type: ${config.type}`,
            };
        }
        const provider = new ModelProviderMap[config.type]({
            ...config,
            url,
        });
        try {
            return provider.chat(prompt);
        } catch (e) {
            return {
                code: -1,
                msg: `Request failed: ${mapError(e)}`,
            };
        }
    },
};
