import path from "path";
import fs from "fs";

import extractFileIcon from "extract-file-icon";
import os from "os";

const iconTempDir = path.join(os.tmpdir(), "focusany-app-icon");

export const getIcon = async (appPath: string, appName: string) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
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
            fs.mkdirSync(iconTempDir, {recursive: true});
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
