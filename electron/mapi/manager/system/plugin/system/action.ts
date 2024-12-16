import {ActionTypeCodeData} from "../../../../../../src/types/Manager";
import {screenCapture} from "../../../plugin/screenCapture";
import {AppsMain} from "../../../../app/main";
import {Page} from "../../../../../page";

export const SystemActionCode = {
    "screenshot": async (focusany: FocusAnyApi, data: ActionTypeCodeData) => {
        screenCapture((image: string) => {
            AppsMain.setClipboardImage(image)
        })
    },
    "guide": async (focusany: FocusAnyApi, data: ActionTypeCodeData) => {
        Page.open('guide', {}).then()
    }
}
