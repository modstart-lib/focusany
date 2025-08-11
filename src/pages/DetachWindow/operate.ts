import {Menu} from "@electron/remote";
import {t} from "../../lang";

export const useDetachWindowOperate = ({plugin}) => {
    const doShowZoomMenu = () => {
        const menuTemplate: any[] = [];
        const zoomPercent = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300];
        for (let z of zoomPercent) {
            menuTemplate.push({
                label: `${z}%`,
                click: async () => {
                    await window.$mapi.manager.setDetachPluginZoom(z);
                    plugin.value.runtime.config.zoom = z;
                },
            });
        }
        Menu.buildFromTemplate(menuTemplate).popup();
    };

    const doShowMoreMenu = () => {
        const autoDetach = !!plugin.value.runtime.config.autoDetach;
        const menuTemplate: any[] = [
            {
                label: t("打开调试窗口"),
                click: async () => {
                    await window.$mapi.manager.openDetachPluginDevTools();
                },
            },
        ];
        if (!(plugin.value.setting && plugin.value.setting.autoDetach)) {
            menuTemplate.push({
                label: t("自动分离为独立窗口显示"),
                type: "checkbox",
                checked: autoDetach,
                click: async () => {
                    await window.$mapi.manager.setPluginAutoDetach(!autoDetach);
                    plugin.value.runtime.config = await window.$mapi.manager.getPluginConfig(plugin.value.name);
                },
            });
        }
        if (plugin.value.setting) {
            if (plugin.value.setting.moreMenu && plugin.value.setting.moreMenu.length > 0) {
                for (const item of plugin.value.setting.moreMenu) {
                    (item => {
                        menuTemplate.push({
                            label: item.title,
                            click: async () => {
                                await window.$mapi.manager.firePluginMoreMenuClick(item.name);
                            },
                        });
                    })(item);
                }
            }
        }
        Menu.buildFromTemplate(menuTemplate).popup();
    };

    const doClose = async () => {
        await window.$mapi.manager.closeDetachPlugin();
    };

    return {
        doShowZoomMenu,
        doShowMoreMenu,
        doClose,
    };
};
