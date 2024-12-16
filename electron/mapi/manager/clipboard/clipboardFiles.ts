import {clipboard} from 'electron';
import plist from 'plist';
import fs from 'fs';
import path from 'path';
import ofs from 'original-fs';
import {isLinux, isMac, isWin} from "../../../lib/env";
import electronClipboardEx from 'electron-clipboard-ex';

export const getClipboardFiles = (): ClipboardFileItem[] => {
    let fileInfo: any;
    if (isMac) {
        if (!clipboard.has('NSFilenamesPboardType')) {
            return [];
        }
        const result = clipboard.read('NSFilenamesPboardType');
        if (!result) {
            return [];
        }
        try {
            fileInfo = plist.parse(result);
        } catch (e) {
            return [];
        }
    } else if (isWin) {
        try {
            /* eslint-disable */
            fileInfo = electronClipboardEx.readFilePaths();
        } catch (e) {
            // todo
        }
    } else if (isLinux) {
        if (!clipboard.has('text/uri-list')) {
            return [];
        }
        const result = clipboard.read('text/uri-list').match(/^file:\/\/\/.*/gm);
        if (!result || !result.length) {
            return [];
        }
        fileInfo = result.map((e) =>
            decodeURIComponent(e).replace(/^file:\/\//, '')
        );
    }
    if (!Array.isArray(fileInfo)) {
        return [];
    }
    const target: any = fileInfo
        .map((p) => {
            if (!fs.existsSync(p)) return false;
            let info;
            try {
                info = ofs.lstatSync(p);
            } catch (e) {
                return false;
            }
            let fileExt = null
            if (info.isFile()) {
                fileExt = path.extname(p).toLowerCase().replace(/^./, '');
            }
            return {
                isFile: info.isFile(),
                isDirectory: info.isDirectory(),
                name: path.basename(p) || p,
                path: p,
                fileExt: fileExt,
            };
        })
        .filter(Boolean);
    return target.length ? target : [];
}

export const setClipboardFiles = (files: string[]) => {
    if (!files || !files.length) {
        return;
    }
    if (isMac) {
        clipboard.writeBuffer(
            'NSFilenamesPboardType',
            Buffer.from(plist.build(files))
        );
    } else if (isWin) {
        electronClipboardEx.writeFilePaths(files);
    } else if (isLinux) {
        // @ts-ignore
        clipboard.write('text/uri-list', files.map((e) => `file://${e}`).join('\n'));
    }
}
