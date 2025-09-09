import {Files} from "../../../../../file/main";

export const listFiles = async (
    paths: string[]
): Promise<
    {
        name: string;
        pathname: string;
        isDirectory: boolean;
        size: number;
        lastModified: number;
    }[]
> => {
    let results: any[] = [];
    for (const path of paths) {
        for (let p of await Files.list(path, {
            isDataPath: false,
        })) {
            results.push(p);
        }
    }
    return results;
};
