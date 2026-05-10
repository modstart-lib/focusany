import fs from "fs";
import path from "path";

import extractFileIcon from "extract-file-icon";
import { AppEnv, waitAppEnvReady } from "../../../../../env";

const getIconTempDir = async () => {
    await waitAppEnvReady();
    return path.join(AppEnv.dataRoot, "cache", "app-icons");
};

export const getIcon = async (appPath: string, appName: string) => {
    try {
        const iconTempDir = await getIconTempDir();
        const iconPath = path.join(iconTempDir, `${appName}.png`);
        const iconPathUrl = `file://${iconPath}`;
        // console.log('iconPath', iconPath, appName, appPath);
        if (fs.existsSync(iconPath)) {
            return iconPathUrl;
        }
        const iconNone = path.join(iconTempDir, `${appName}.none`);
        const iconNoneUrl = `file://${iconNone}`;
        if (fs.existsSync(iconNone)) {
            return iconNoneUrl;
        }
        if (!fs.existsSync(iconTempDir)) {
            fs.mkdirSync(iconTempDir, { recursive: true });
        }
        const buffer = extractFileIcon(appPath, 32);
        fs.writeFileSync(iconPath, buffer, "base64");
        if (fs.existsSync(iconPath)) {
            return iconPathUrl;
        } else {
            fs.writeFileSync(iconNone, "");
        }
    } catch (e) {}
    return null;
};
