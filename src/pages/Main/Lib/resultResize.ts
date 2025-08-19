import {onBeforeUnmount, onMounted} from "vue";
import {UI} from "../../../lib/ui";
import {useManagerStore} from "../../../store/modules/manager";
import {WindowConfig} from "../../../../electron/config/window";

const manager = useManagerStore();

let ignoreNextResize = false;
export const ignoreNextResultResize = () => {
    ignoreNextResize = true;
}

export const useResultResize = (groupContainer: any) => {
    onMounted(() => {
        UI.onResize(groupContainer.value, (width: number, height: number) => {
            // console.log('resize', width, height, manager.activePlugin)
            if (!manager.activePlugin && !ignoreNextResize) {
                manager.resize(width, height + WindowConfig.mainHeight).then();
            } else if (manager.activePlugin && manager.activePluginType === 'code') {
                manager.resize(width, height + WindowConfig.mainHeight).then();
            }
        });
    });
    onBeforeUnmount(() => {
        UI.offResize(groupContainer.value);
    });
};

export const fireResultResize = (groupContainer: any) => {
    // console.log('fireResultResize', groupContainer.value)
    UI.fireResize(groupContainer.value);
};
