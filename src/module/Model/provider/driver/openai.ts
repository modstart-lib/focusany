import {ModelChatResult} from "../provider";
import {ProviderType} from "../../types";
import {AbstractModelProvider} from "./base";

export class OpenAiModelProvider extends AbstractModelProvider {
    constructor(config: {
        type: ProviderType;
        url: string;
        apiUrl: string;
        apiHost: string;
        apiKey: string;
        [p: string]: any;
    }) {
        super(config);
    }

    async chat(prompt: string): Promise<ModelChatResult> {
        const response = await fetch(this.config.url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: this.config.modelId,
                messages: [{role: "user", content: prompt}],
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw `Request failed: ${response.status}\n${error}`;
        }
        const data = await response.json();
        const content = data.choices[0].message.content;
        return {
            code: 0,
            msg: "ok",
            data: {
                content,
            },
        };
    }
}
