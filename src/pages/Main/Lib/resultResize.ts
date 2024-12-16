import {onBeforeUnmount, onMounted} from "vue";
import {UI} from "../../../lib/ui";
import {useManagerStore} from "../../../store/modules/manager";
import {WindowConfig} from "../../../../electron/config/window";

const manager = useManagerStore()

export const useResultResize = (groupContainer: any) => {
    onMounted(() => {
        UI.onResize(groupContainer.value, (width: number, height: number) => {
            // console.log('resize', width, height, manager.activePlugin)
            if (!manager.activePlugin) {
                manager.resize(width, height + WindowConfig.mainHeight).then()
            }
        });
    });
    onBeforeUnmount(() => {
        UI.offResize(groupContainer.value);
    });
}

export const fireResultResize = (groupContainer: any) => {
    UI.fireResize(groupContainer.value)
}

