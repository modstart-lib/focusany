import {AppsMain} from "../../app/main";

export const colorPicker = async (): Promise<string> => {
    await AppsMain.toast('正在开发')
    return '#FFFFFF';
};
