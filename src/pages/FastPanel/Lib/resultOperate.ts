import {useManagerStore} from "../../../store/modules/manager";
import {ActionRecord} from "../../../types/Manager";

const manager = useManagerStore()

export const useResultOperate = () => {

    const doOpenAction = async (action: ActionRecord) => {
        // await manager.showMainWindow()
        await manager.openAction(action)
    }

    return {
        doOpenAction,
    }
}
