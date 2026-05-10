import { t } from "../lang";

export function mapError(msg: any) {
    if (typeof msg !== "string") {
        msg = msg.toString();
    }
    const map = {
        PublishVersionNotMatch: "error.publishVersionNotMatch",
        PluginNotExists: "error.pluginNotExists",
        PluginFormatError: "error.pluginFormatError",
        PluginAlreadyExists: "error.pluginAlreadyExists",
        PluginNotSupportPlatform: "error.pluginNotSupportPlatform",
        PluginVersionNotMatch: "error.pluginVersionNotMatch",
        PluginEditionNotMatch: "error.pluginEditionNotMatch",
        PluginReleaseDocNotFound: "error.pluginReleaseDocNotFound",
        PluginReleaseDocFormatError: "error.pluginReleaseDocFormatError",
    };
    for (let key in map) {
        if (msg.includes(key)) {
            const translationKey = map[key];
            // regex PluginReleaseDocFormatError:-11
            const regex = new RegExp(`${key}:(-?\\d+):?([\\w\\d]*)`);
            const match = msg.match(regex);
            // console.log('match', match)
            let error = t(translationKey);
            if (match) {
                error += `(${match[1]})`;
                if (match[2]) {
                    error += `(${match[2]})`;
                }
            }
            return error;
        }
    }
    return msg;
}
