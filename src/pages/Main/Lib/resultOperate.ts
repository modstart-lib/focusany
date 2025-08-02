import {computed, ref, watch} from "vue";
import {chunk} from "lodash-es";
import {ActionRecord, PluginRecord} from "../../../types/Manager";
import {useManagerStore} from "../../../store/modules/manager";
import {ComputedRef} from "@vue/reactivity";
import {EntryListener} from "./entryListener";
import {Dialog} from "../../../lib/dialog";

type ActionGroupType = "window" | "search" | "match" | "history" | "pin" | never;

const manager = useManagerStore();

export const useResultOperate = () => {
    const hasActions = computed(() => {
        return (
            manager.detachWindowActions.length > 0 ||
            manager.searchActions.length > 0 ||
            manager.matchActions.length > 0 ||
            manager.historyActions.length > 0 ||
            manager.pinActions.length > 0
        );
    });
    const hasViewActions = computed(() => {
        return manager.viewActions.length > 0;
    });
    const lineActionCount = computed(() => {
        return manager.viewActions.length > 0 ? 5 : 8;
    });

    const searchActionIsExtend = ref<Boolean>(false);
    const matchActionIsExtend = ref<Boolean>(false);
    const historyActionIsExtend = ref<Boolean>(false);
    const pinActionIsExtend = ref<Boolean>(false);

    watch(
        () => manager.searchActions,
        () => {
            searchActionIsExtend.value = manager.searchActions.length <= lineActionCount.value;
            resetActive();
        }
    );
    watch(
        () => manager.matchActions,
        () => {
            matchActionIsExtend.value = manager.matchActions.length <= lineActionCount.value;
            resetActive();
        }
    );
    watch(
        () => manager.historyActions,
        () => {
            historyActionIsExtend.value = manager.historyActions.length <= lineActionCount.value;
            resetActive();
        }
    );
    watch(
        () => manager.pinActions,
        () => {
            pinActionIsExtend.value = manager.pinActions.length <= lineActionCount.value;
            resetActive();
        }
    );

    const doSearchActionExtend = () => {
        if (searchActionIsExtend.value) {
            return;
        }
        searchActionIsExtend.value = true;
    };
    const doMatchActionExtend = () => {
        if (matchActionIsExtend.value) {
            return;
        }
        matchActionIsExtend.value = true;
    };
    const doHistoryActionExtend = () => {
        if (historyActionIsExtend.value) {
            return;
        }
        historyActionIsExtend.value = true;
    };
    const doPinActionExtend = () => {
        if (pinActionIsExtend.value) {
            return;
        }
        pinActionIsExtend.value = true;
    };

    const showDetachWindowActions: ComputedRef<ActionRecord[]> = computed(() => {
        return manager.detachWindowActions;
    });
    const showSearchActions: ComputedRef<ActionRecord[]> = computed(() => {
        return searchActionIsExtend.value
            ? manager.searchActions
            : manager.searchActions.slice(0, lineActionCount.value);
    });
    const showMatchActions: ComputedRef<ActionRecord[]> = computed(() => {
        return matchActionIsExtend.value ? manager.matchActions : manager.matchActions.slice(0, lineActionCount.value);
    });
    const showHistoryActions: ComputedRef<ActionRecord[]> = computed(() => {
        return historyActionIsExtend.value
            ? manager.historyActions
            : manager.historyActions.slice(0, lineActionCount.value);
    });
    const showPinActions: ComputedRef<ActionRecord[]> = computed(() => {
        return pinActionIsExtend.value ? manager.pinActions : manager.pinActions.slice(0, lineActionCount.value);
    });

    const activeActionGroup = ref<ActionGroupType>("search");
    const actionActionIndex = ref<number>(0);
    const resetActive = () => {
        if (manager.detachWindowActions.length > 0) {
            activeActionGroup.value = "window";
        } else if (manager.searchActions.length > 0) {
            activeActionGroup.value = "search";
        } else if (manager.matchActions.length > 0) {
            activeActionGroup.value = "match";
        } else if (manager.historyActions.length > 0) {
            activeActionGroup.value = "history";
        } else if (manager.pinActions.length > 0) {
            activeActionGroup.value = "pin";
        }
        actionActionIndex.value = 0;
    };

    const doActionNavigate = (direction: string) => {
        const grids: any[][] = [];
        [
            [showDetachWindowActions.value, "window"],
            [showSearchActions.value, "search"],
            [showMatchActions.value, "match"],
            [showHistoryActions.value, "history"],
            [showPinActions.value, "pin"],
        ].forEach(actions => {
            let items = [] as any[];
            (actions[0] as ActionRecord[]).forEach((_, itemIndex) => {
                items.push({
                    group: actions[1],
                    index: itemIndex,
                });
            });
            chunk(items, lineActionCount.value).forEach(chunk => {
                grids.push(chunk);
            });
        });
        let activeGridRowIndex = grids.findIndex(gridLine =>
            gridLine.find(grid => grid.group === activeActionGroup.value && grid.index === actionActionIndex.value)
        );
        let activeGridColIndex = grids[activeGridRowIndex].findIndex(
            grid => grid.group === activeActionGroup.value && grid.index === actionActionIndex.value
        );
        switch (direction) {
            case "up":
                if (activeGridRowIndex > 0) {
                    activeGridRowIndex--;
                    activeGridColIndex = Math.min(activeGridColIndex, grids[activeGridRowIndex].length - 1);
                }
                break;
            case "down":
                if (activeGridRowIndex < grids.length - 1) {
                    activeGridRowIndex++;
                    activeGridColIndex = Math.min(activeGridColIndex, grids[activeGridRowIndex].length - 1);
                }
                break;
            case "left":
                activeGridColIndex--;
                if (activeGridColIndex < 0) {
                    if (activeGridRowIndex > 0) {
                        activeGridRowIndex--;
                        activeGridColIndex = grids[activeGridRowIndex].length - 1;
                    } else {
                        activeGridColIndex = 0;
                    }
                }
                break;
            case "right":
                activeGridColIndex++;
                if (activeGridColIndex >= grids[activeGridRowIndex].length) {
                    if (activeGridRowIndex < grids.length - 1) {
                        activeGridRowIndex++;
                        activeGridColIndex = 0;
                    } else {
                        activeGridColIndex = grids[activeGridRowIndex].length - 1;
                    }
                }
                break;
        }
        activeActionGroup.value = grids[activeGridRowIndex][activeGridColIndex].group;
        actionActionIndex.value = grids[activeGridRowIndex][activeGridColIndex].index;
        manager.setSelectedAction(getActiveAction() as ActionRecord);
    };

    const getActiveAction = () => {
        let activeAction: any = null;
        switch (activeActionGroup.value) {
            case "window":
                activeAction = showDetachWindowActions.value[actionActionIndex.value];
                break;
            case "search":
                activeAction = showSearchActions.value[actionActionIndex.value];
                break;
            case "match":
                activeAction = showMatchActions.value[actionActionIndex.value];
                break;
            case "history":
                activeAction = showHistoryActions.value[actionActionIndex.value];
                break;
            case "pin":
                activeAction = showPinActions.value[actionActionIndex.value];
                break;
        }
        return activeAction as ActionRecord | null;
    };

    const onInputKey = (key: string) => {
        if (["up", "down", "left", "right"].includes(key)) {
            doActionNavigate(key);
        } else if ("enter" === key) {
            if (manager.searchIsCompositing) {
                return;
            }
            const action = getActiveAction();
            if (action) {
                if (activeActionGroup.value === "window") {
                    openActionForWindow("open", action).then();
                } else {
                    doOpenAction(action).then();
                }
            }
        } else if ("delete" === key) {
            if ("" === manager.searchValue) {
                onClose();
            }
        } else if ("paste" === key) {
            if (!manager.activePlugin) {
                EntryListener.prepareSearch({isPaste: true}).then();
            }
        }
    };

    const onClose = () => {
        if (manager.activePlugin) {
            doClosePlugin().then();
        } else {
            manager.setCurrentFiles([]);
            manager.setCurrentImage("");
            manager.setCurrentText("");
            manager.search("").then();
        }
    };

    const doClosePlugin = async (plugin?: PluginRecord) => {
        await manager.closeMainPlugin(plugin);
    };

    const doOpenAction = async (action: ActionRecord) => {
        await manager.openAction(action);
    };

    const openActionForWindow = async (type: "open", action: ActionRecord) => {
        await manager.openActionForWindow(type, action);
    };

    const doHistoryClear = async () => {
        Dialog.confirm("确认清除全部？").then(() => {
            window.$mapi.manager.historyClear();
            manager.searchRefresh().then();
        });
    };

    const doHistoryDelete = async (action: ActionRecord) => {
        await window.$mapi.manager.historyDelete(action.pluginName as string, action.name);
        await manager.searchRefresh();
    };

    const doPinToggle = async (action: ActionRecord) => {
        await window.$mapi.manager.togglePinAction(action.pluginName as string, action.name);
        await manager.searchRefresh();
    };

    return {
        hasActions,
        hasViewActions,
        searchActionIsExtend,
        matchActionIsExtend,
        historyActionIsExtend,
        pinActionIsExtend,
        doSearchActionExtend,
        doMatchActionExtend,
        doHistoryActionExtend,
        doPinActionExtend,
        showDetachWindowActions,
        showSearchActions,
        showMatchActions,
        showHistoryActions,
        showPinActions,
        activeActionGroup,
        actionActionIndex,
        doActionNavigate,
        getActiveAction,
        onInputKey,
        onClose,
        doOpenAction,
        openActionForWindow,
        doHistoryClear,
        doHistoryDelete,
        doPinToggle,
    };
};
