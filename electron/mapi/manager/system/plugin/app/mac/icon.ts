import path from 'node:path';
import fs from 'fs';
import {exec} from 'child_process';
import {Files} from "../../../../../file/main";
import os from "os";

const iconTempDir = path.join(os.tmpdir(), 'focusany-app-icon');
// console.log('iconTempDir', iconTempDir)
const defaultIcon = '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns';

const getIconFile = (appFileInput) => {
    return new Promise((resolve, reject) => {
        const plistPath = path.join(appFileInput, 'Contents', 'Info.plist');
        Files.read(plistPath, {
            isFullPath: true
        }).then((plistContent) => {
            if (plistContent) {
                // parse CFBundleIconFile
                const mat = plistContent.match(/<key>CFBundleIconFile<\/key>\s*<string>(.*?)<\/string>/)
                if (mat) {
                    const CFBundleIconFile = mat[1]
                    const iconFile = path.join(
                        appFileInput,
                        'Contents',
                        'Resources',
                        CFBundleIconFile
                    );
                    const iconFiles = [iconFile, iconFile + '.icns', iconFile + '.tiff']
                    const existedIcon = iconFiles.find((iconFile) => {
                        return fs.existsSync(iconFile);
                    });
                    // console.log('manager.app.mac.app2png.getIconFile', existedIcon)
                    resolve(existedIcon || defaultIcon);
                    return
                }
            }
            resolve(defaultIcon);
        }).catch((e) => {
            console.log('manager.app.mac.app2png.getIconFile.error', e)
            resolve(defaultIcon);
        })
    });
};

const tiffToPng = (iconFile, pngFileOutput) => {
    return new Promise((resolve, reject) => {
        exec(
            `sips -s format png '${iconFile}' --out '${pngFileOutput}' --resampleHeightWidth 64 64`,
            (error) => {
                error ? reject(error) : resolve(null);
            }
        );
    });
};

const app2png = (appFileInput, pngFileOutput) => {
    return getIconFile(appFileInput).then((iconFile) => {
        // console.log('manager.app.mac.app2png.app2png', iconFile, pngFileOutput)
        return tiffToPng(iconFile, pngFileOutput);
    });
};


export const getIcon = async (appPath: string, appName: string) => {
    try {
        const iconPathUrl = 'file://' + path.join(iconTempDir, `${encodeURIComponent(appName)}.png`)
        const iconPath = path.join(iconTempDir, `${appName}.png`);
        if (await Files.exists(iconPath, {isFullPath: true})) {
            return iconPathUrl
        }
        const iconNone = path.join(iconTempDir, `${appName}.none`);
        const iconNoneUrl = path.join(iconTempDir, `${appName}.none`);
        if (await Files.exists(iconNone, {isFullPath: true})) {
            return iconNoneUrl;
        }
        if (!await Files.exists(iconTempDir, {isFullPath: true})) {
            fs.mkdirSync(iconTempDir, {recursive: true});
        }
        await app2png(appPath, iconPath);
        if (!await Files.exists(iconPath, {isFullPath: true})) {
            fs.writeFileSync(iconNone, '');
            throw 'IconGetError';
        }
        return iconPathUrl;
    } catch (e) {
    }
    return `file://${defaultIcon}`;
}
