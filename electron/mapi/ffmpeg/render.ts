import ffmpegPath from "ffmpeg-static";
import {binResolve, isPackaged} from "../../lib/env";
import {Apps} from "../app";

const getBinPath = () => {
    if (isPackaged) {
        return binResolve("ffmpeg/ffmpeg");
    }
    return ffmpegPath;
};

const version = async () => {
    const controller = await Apps.spawnShell(`${getBinPath()} -version`);
    const text = await controller.result();
    const match = text.match(/ffmpeg version ([\d.]+)/);
    return match ? match[1] : "";
};

const run = async (args: string[]) => {
    if (args[0] !== getBinPath()) {
        args.unshift(getBinPath());
    }
    const controller = await Apps.spawnShell(args, {
        shell: false,
    });
    return await controller.result();
};

export default {
    version,
    run,
};
