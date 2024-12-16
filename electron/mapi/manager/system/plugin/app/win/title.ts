import {exec} from "child_process";
import {IconvUtil} from "../../../../../../lib/util";

export const getAppTitle = async (locale: string, pathname: string, name: string) => {
    // (Get-ItemProperty -Path 'C:\\Program Files (x86)\\360\\360zip\\360zip.exe').VersionInfo.FileDescription
    // (Get-ItemProperty -Path 'C:\\Program Files (x86)\\360\\360Safe\\360Safe.exe').VersionInfo.FileDescription
    // (Get-ItemProperty -Path 'C:\\Windows\\SysWOW64\\msiexec.exe').VersionInfo.FileDescription
    const command = `powershell -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; (Get-ItemProperty -Path '${pathname}').VersionInfo.FileDescription"`;
    return new Promise<string>((resolve, reject) => {
        exec(command, {
            encoding: 'utf-8'
        }, (error, stdout, stderr) => {
            if (error) {
                resolve(name)
            } else {
                // console.log('win.getAppTitle', {
                //     locale,
                //     pathname,
                //     name,
                //     stdout: stdout,
                //     title: stdout.toString()?.trim(),
                // })
                resolve(stdout.toString()?.trim());
            }
        });
    });
}
