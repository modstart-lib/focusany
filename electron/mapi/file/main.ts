import {dialog, ipcMain, shell} from "electron";
import fileIndex from "./index";

ipcMain.handle("file:openFile", async (_, options): Promise<string | null> => {
    const res = await dialog
        .showOpenDialog({
            properties: ["openFile"],
            ...options,
        })
        .catch(e => {
        });
    if (!res || res.canceled) {
        return null;
    }
    return res.filePaths?.[0] || null;
});

ipcMain.handle("file:openDirectory", async (_, options): Promise<string | null> => {
    const res = await dialog
        .showOpenDialog({
            properties: ["openDirectory"],
            ...options,
        })
        .catch(e => {
        });
    if (!res || res.canceled) {
        return null;
    }
    return res.filePaths?.[0] || null;
});

ipcMain.handle("file:openSave", async (_, options): Promise<string | null> => {
    const res = await dialog
        .showSaveDialog({
            ...options,
        })
        .catch(e => {
        });
    if (!res || res.canceled) {
        return null;
    }
    return res.filePath || null;
});

export default {
    ...fileIndex,
};

export const Files = {
    ...fileIndex,
};
