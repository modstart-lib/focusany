import path from "node:path";
import fs from "node:fs";

export const getIcon = async (desktopInfo: Record<string, string>, pathname: string, name: string) => {
    if (!desktopInfo.Icon) {
        return null;
    }
    const themes = ["hicolor"];
    const sizes = ["scalable", "512x512", "256x256", "48x48", "32x32"];
    const types = ["apps"];
    const exts = [".png", ".svg"];
    for (const theme of themes) {
        for (const size of sizes) {
            for (const type of types) {
                for (const ext of exts) {
                    let iconPath = path.join("/usr/share/icons", theme, size, type, desktopInfo.Icon + ext);
                    if (fs.existsSync(iconPath)) {
                        return "file://" + iconPath;
                    }
                }
            }
        }
    }
    return null;
};
