const langDirMap = {
    "zh-CN": ["zh_CN"],
};

export const getAppTitle = async (
    desktopInfo: Record<string, string>,
    locale: string,
    pathname: string,
    name: string
) => {
    if (locale in langDirMap) {
        for (const k of langDirMap[locale]) {
            const infoKey = `Name[${k}]`;
            if (desktopInfo[infoKey]) {
                return desktopInfo[infoKey];
            }
        }
    }
    if (desktopInfo.Name) {
        return desktopInfo.Name;
    }
    return name;
};
