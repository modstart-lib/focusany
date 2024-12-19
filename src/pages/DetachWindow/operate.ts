import {Menu} from "@electron/remote";

export const useDetachWindowOperate = ({plugin}) => {
    const doShowZoomMenu = () => {
        const menuTemplate: any[] = []
        const zoomPercent = [
            50, 67, 75, 80, 90, 100,
            110, 125, 150, 175, 200, 250, 300,
        ]
        for (let z of zoomPercent) {
            menuTemplate.push({
                label: `${z}%`,
                click: async () => {
                    await window.$mapi.manager.setDetachPluginZoom(z)
                    plugin.value.runtime.config.zoom = z
                }
            })
        }
        Menu.buildFromTemplate(menuTemplate).popup();
    };

    const doShowMoreMenu = () => {
        const autoDetach = !!plugin.value.runtime.config.autoDetach
        const menuTemplate: any[] = [
            {
                label: '打开调试窗口',
                click: async () => {
                    await window.$mapi.manager.openDetachPluginDevTools()
                }
            },
        ]
        if (!(plugin.value.setting && plugin.value.setting.autoDetach)) {
            menuTemplate.push({
                label: '自动分离为独立窗口显示',
                type: 'checkbox',
                checked: autoDetach,
                click: async () => {
                    await window.$mapi.manager.setPluginAutoDetach(!autoDetach)
                    plugin.value.runtime.config = await window.$mapi.manager.getPluginConfig(plugin.value.name)
                }
            })
        }
        Menu.buildFromTemplate(menuTemplate).popup();
    }

    const doClose = async () => {
        await window.$mapi.manager.closeDetachPlugin()
    }

    return {
        doShowZoomMenu,
        doShowMoreMenu,
        doClose
    }
}
