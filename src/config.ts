import packageJson from "../package.json";

const BASE_URL = "https://focusany.com";

export const AppConfig = {
    name: "FocusAny",
    slogan: "专注提效的AI工具条",
    version: packageJson.version,
    website: `${BASE_URL}`,
    websiteGithub: "https://github.com/modstart-lib/focusany",
    websiteGitee: "https://gitee.com/modstart-lib/focusany",
    apiBaseUrl: `${BASE_URL}/api`,
    updaterUrl: `${BASE_URL}/app_manager/updater/open`,
    downloadUrl: `${BASE_URL}/app_manager/download`,
    feedbackUrl: `${BASE_URL}/feedback_ticket`,
    statisticsUrl: `${BASE_URL}/app_manager/collect`,
    guideUrl: `${BASE_URL}/app_manager/guide`,
    helpUrl: `${BASE_URL}/app_manager/help`,
    basic: {
        userEnable: false,
    },
};
