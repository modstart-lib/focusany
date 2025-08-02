import {useManagerStore} from "../../../store/modules/manager";
import {computed} from "vue";

const manager = useManagerStore();
export const useMainOperate = () => {
    const hasActions = computed(() => {
        return (
            manager.searchActions.length > 0 ||
            manager.matchActions.length > 0 ||
            manager.historyActions.length > 0 ||
            manager.pinActions.length > 0
        );
    });

    let detachHotKey: any = null;
    let detachHotkeyExpire = 0;
    let detachHotkeyTimes = 0;

    const onKeyDown = (e: KeyboardEvent) => {
        let resultKey = "";

        const {ctrlKey, shiftKey, altKey, metaKey} = e;

        const modifiers: Array<string> = [];
        ctrlKey && modifiers.push("control");
        shiftKey && modifiers.push("shift");
        altKey && modifiers.push("alt");
        metaKey && modifiers.push("meta");

        if (!detachHotKey) {
            detachHotKey = manager.configGet("detachWindowTrigger", null);
        }
        // console.log('keydown', e)
        // {"key":"D","altKey":false,"ctrlKey":false,"metaKey":true,"shiftKey":false,"times":1}
        if (detachHotKey && detachHotKey.value) {
            // console.log('detachHotkeyExpire', detachHotKey.value.key, detachHotkeyExpire)
            if (
                detachHotKey.value.key === e.key.toUpperCase() &&
                detachHotKey.value.altKey === altKey &&
                detachHotKey.value.ctrlKey === ctrlKey &&
                detachHotKey.value.metaKey === metaKey &&
                detachHotKey.value.shiftKey === shiftKey
            ) {
                if (!detachHotkeyExpire || Date.now() > detachHotkeyExpire) {
                    detachHotkeyExpire = Date.now() + 500;
                    detachHotkeyTimes = 1;
                } else {
                    detachHotkeyTimes++;
                }
                if (detachHotkeyTimes >= detachHotKey.value.times) {
                    detachHotkeyExpire = 0;
                    detachHotkeyTimes = 0;
                    manager.detachPlugin();
                    return {
                        resultKey,
                    };
                }
            }
        }
        const map = {
            Escape: "esc",
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowDown: "down",
            ArrowUp: "up",
            Enter: "enter",
            " ": "space",
        };
        const key = map[e.key] || "custom";
        switch (key) {
            case "up":
            case "down":
            case "left":
            case "right":
            case "enter":
                if (hasActions.value) {
                    resultKey = key;
                }
                break;
            case "esc":
                if (manager.activePlugin) {
                    manager.closeMainPlugin().then();
                } else {
                    manager.hideMainWindow().then();
                }
                break;
            default:
                switch (e.keyCode) {
                    case 8:
                        if (manager.searchValue === "") {
                            resultKey = "delete";
                        }
                        break;
                    case 86:
                        if (manager.searchValue === "") {
                            if (ctrlKey || metaKey) {
                                resultKey = "paste";
                            }
                        }
                        break;
                }
                break;
        }
        if (resultKey) {
            e.preventDefault();
        }
        return {
            resultKey,
        };
    };

    return {
        onKeyDown,
    };
};
