// @ts-ignore
import {Model, Provider} from "../../../../src/module/Model/types";
// @ts-ignore
import {getProviderLogo, getProviderTitle, SystemProviders} from "../../../../src/module/Model/providers";
// @ts-ignore
import {SystemModels} from "../../../../src/module/Model/models";
import StorageMain from "../../storage/main";
import User from "../../user/main";
import {AppConfig} from "../../../../src/config";
import {ModelProvider} from "../../../../src/module/Model/provider/provider";

const listProviders = async (): Promise<Provider[]> => {
    const results: Provider[] = [];
    for (const providerId in SystemProviders) {
        const provider = SystemProviders[providerId];
        results.push({
            id: providerId,
            type: "openai",
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
                apiKey: "",
                apiHost: "",
                models: (SystemModels[providerId] || []).map(m => {
                    return {
                        id: m.id,
                        provider: providerId,
                        name: m.name,
                        group: m.group,
                        types: ["text"],
                        enabled: false,
                    } as any;
                }),
                enabled: false,
            },
        });
    }
    const storageData = await StorageMain.read("models", []);
    if (storageData) {
        if (storageData.userProviders) {
            storageData.userProviders.forEach(provider => {
                results.unshift({
                    id: provider.id,
                    type: provider.type,
                    title: provider.title,
                    logo: null,
                    isSystem: false,
                    apiUrl: "",
                    websites: {
                        official: "",
                        docs: "",
                        models: "",
                    },
                    data: {
                        apiKey: "",
                        apiHost: "",
                        models: [],
                        enabled: false,
                    },
                });
            });
        }
        if (storageData.providerData) {
            for (const providerId in storageData.providerData) {
                const provider = results.find(p => p.id === providerId);
                if (provider) {
                    provider.data.apiKey = storageData.providerData[providerId].apiKey || "";
                    provider.data.apiHost = storageData.providerData[providerId].apiHost;
                    (storageData.providerData[providerId].models || []).forEach(model => {
                        const existingModel = provider.data.models.find(m => m.id === model.id);
                        if (existingModel) {
                            existingModel.name = model.name;
                            existingModel.group = model.group;
                            existingModel.types = model.types;
                            existingModel.enabled = model.enabled || false;
                        } else {
                            provider.data.models.push({
                                id: model.id,
                                provider: providerId,
                                name: model.name,
                                group: model.group,
                                types: ["text"],
                                enabled: model.enabled || false,
                                editable: true,
                            });
                        }
                    });
                    provider.data.enabled = storageData.providerData[providerId].enabled || false;
                }
            }
        }
    }
    const user = await User.get()
    if (user.data && user.data.lmApi && user.data.lmApi.models) {
        const lmApi = user.data.lmApi;
        const models: Model[] = [];
        for (const m of lmApi.models) {
            models.push({
                id: m,
                provider: "buildIn",
                name: m,
                group: "Default",
                types: ["text"],
                enabled: true,
                editable: false,
            });
        }
        results.unshift({
            id: "buildIn",
            type: "openai",
            title: getProviderTitle("buildIn"),
            logo: getProviderLogo("buildIn"),
            isSystem: true,
            apiUrl: lmApi.apiUrl,
            websites: {
                official: AppConfig.website,
                docs: AppConfig.website,
                models: AppConfig.website,
            },
            data: {
                apiKey: lmApi.apiKey,
                apiHost: "",
                models: models,
                enabled: true,
            },
        });
    }
    return results;
}

export const listModels = async () => {
    const providers = await listProviders();
    const results: {
        providerId: string;
        providerLogo: string;
        providerTitle: string;
        modelId: string;
        modelName: string;
    }[] = [];
    for (const provider of providers) {
        if (!provider.data || !provider.data.enabled || !provider.data.models) {
            continue;
        }
        for (const model of provider.data.models) {
            if (model.enabled) {
                results.push({
                    providerId: provider.id,
                    providerLogo: provider.logo || "",
                    providerTitle: provider.title,
                    modelId: model.id,
                    modelName: model.name,
                });
            }
        }
    }
    return results;
}

export const modelChat = async (
    providerId: string,
    modelId: string,
    message: string
): Promise<{
    code: number;
    msg: string;
    data?: {
        message: string;
    };
}> => {
    const providers = await listProviders();
    const provider = providers.find(p => p.id === providerId);
    if (!provider) {
        throw new Error(`Provider not found: ${providerId}`);
    }
    const model = provider.data.models.find(m => m.id === modelId);
    if (!model || !model.enabled) {
        throw new Error(`Model not found or not enabled: ${modelId}`);
    }
    const res = await ModelProvider.chat(message, {
        type: provider.type,
        modelId: model.id,
        apiUrl: provider.apiUrl,
        apiHost: provider.data.apiHost,
        apiKey: provider.data.apiKey,
    });
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
            message: res.data.content,
        }
    }
}
