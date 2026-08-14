/**
 * find-focusany.ts — locate the locally installed FocusAny CLI binary and the
 * FocusAny runtime (data dir + auth) on the current machine.
 *
 * Search priority for the CLI binary:
 *   1. --cli <path>  (explicit override)
 *   2. FOCUSANY_CLI  (environment variable)
 *   3. `focusany` on PATH
 *   4. common install locations (~/.focusany/bin, ~/.local/bin,
 *      /usr/local/bin, /opt/homebrew/bin, dist-cli/ of the current project)
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";

export interface CliLocateResult {
    path: string | null;
    source: "arg" | "env" | "path" | "home" | "dist" | null;
}

/** platform+arch specific binary name, e.g. focusany-darwin-arm64 */
function archCliName(): string {
    const platform = process.platform;
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    const ext = platform === "win32" ? ".exe" : "";
    if (platform === "win32") {
        return `focusany-win-${arch}${ext}`;
    }
    if (platform === "darwin") {
        return `focusany-darwin-${arch}`;
    }
    return `focusany-linux-${arch}`;
}

function isExecutable(p: string): boolean {
    try {
        return fs.statSync(p).isFile();
    } catch {
        return false;
    }
}

/** dist-cli directories of the current project and its ancestors (max 3 levels) */
function distCliCandidates(): string[] {
    const candidates: string[] = [];
    let dir = process.cwd();
    for (let i = 0; i < 4; i++) {
        candidates.push(path.join(dir, "dist-cli", archCliName()));
        const parent = path.dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    return candidates;
}

/** home-dir based candidates, e.g. ~/.focusany/bin/focusany-darwin-arm64 */
function homeCandidates(): string[] {
    const home = os.homedir();
    const name = archCliName();
    const bases = [path.join(home, ".focusany", "bin"), path.join(home, ".local", "bin")];
    const out: string[] = [];
    for (const base of bases) {
        out.push(path.join(base, name));
        out.push(path.join(base, "focusany"));
    }
    return out;
}

/** locate the local FocusAny CLI binary */
export function locateFocusanyCli(options?: { cli?: string }): CliLocateResult {
    const explicit = options?.cli;
    if (explicit) {
        const p = path.resolve(explicit);
        return isExecutable(p)
            ? {path: p, source: "arg"}
            : {path: null, source: "arg"};
    }

    const envCli = process.env.FOCUSANY_CLI;
    if (envCli) {
        const p = path.resolve(envCli);
        if (isExecutable(p)) {
            return {path: p, source: "env"};
        }
    }

    // search on PATH (`which focusany` / `where focusany`)
    const whichCmd = process.platform === "win32" ? "where" : "which";
    try {
        const r = spawnSync(whichCmd, ["focusany"], {encoding: "utf-8"});
        if (r.status === 0 && r.stdout) {
            const first = r.stdout.split(/\r?\n/)[0].trim();
            if (first && isExecutable(first)) {
                return {path: first, source: "path"};
            }
        }
    } catch {
        // ignore, fall through to home/dist candidates
    }

    // common install locations
    for (const p of homeCandidates()) {
        if (isExecutable(p)) {
            return {path: p, source: "home"};
        }
    }

    const sysDirs = process.platform === "darwin"
        ? ["/usr/local/bin", "/opt/homebrew/bin"]
        : process.platform === "win32"
            ? [path.join(process.env.LOCALAPPDATA || os.homedir(), "Programs", "FocusAny")]
            : ["/usr/local/bin"];
    for (const dir of sysDirs) {
        const p = path.join(dir, process.platform === "win32" ? "focusany.exe" : "focusany");
        if (isExecutable(p)) {
            return {path: p, source: "home"};
        }
    }

    for (const p of distCliCandidates()) {
        if (isExecutable(p)) {
            return {path: p, source: "dist"};
        }
    }

    return {path: null, source: null};
}

/** locate the FocusAny desktop app installation */
export function findFocusanyApp(): { path: string | null } {
    if (process.platform === "darwin") {
        const p = "/Applications/FocusAny.app";
        return {path: fs.existsSync(p) ? p : null};
    }
    if (process.platform === "win32") {
        const p = path.join(process.env.LOCALAPPDATA || os.homedir(), "Programs", "FocusAny", "FocusAny.exe");
        return {path: fs.existsSync(p) ? p : null};
    }
    if (process.platform === "linux") {
        for (const p of [
            path.join(os.homedir(), "Applications", "FocusAny.AppImage"),
            "/opt/FocusAny/focusany",
        ]) {
            if (fs.existsSync(p)) {
                return {path: p};
            }
        }
    }
    return {path: null};
}

/** resolve the FocusAny data root (FOCUSANY_DATA_ROOT > ~/.focusany/client.json dataRoot > ~/.focusany/data) */
export function getFocusanyDataRoot(): string {
    const envRoot = process.env.FOCUSANY_DATA_ROOT;
    if (envRoot) {
        return envRoot;
    }
    const clientJson = path.join(os.homedir(), ".focusany", "client.json");
    try {
        const cfg = JSON.parse(fs.readFileSync(clientJson, "utf-8"));
        if (cfg.dataRoot) {
            return cfg.dataRoot;
        }
        if (cfg.dataPath) {
            return cfg.dataPath;
        }
    } catch {
        // ignore, fall through to default
    }
    return path.join(os.homedir(), ".focusany", "data");
}

export interface ServiceStatus {
    running: boolean;
    dataRoot: string;
    cliAuthPath: string;
    port?: number;
    tokenMasked?: string;
    reason?: string;
}

/** check whether the FocusAny HTTP service is running (via cli-auth.json) */
export function checkService(): ServiceStatus {
    const dataRoot = getFocusanyDataRoot();
    const cliAuthPath = path.join(dataRoot, "cli-auth.json");
    const status: ServiceStatus = {
        running: false,
        dataRoot,
        cliAuthPath,
    };
    let raw: string;
    try {
        raw = fs.readFileSync(cliAuthPath, "utf-8");
    } catch {
        status.reason = "cli-auth.json not found — FocusAny is not running";
        return status;
    }
    let auth: { port?: number; token?: string };
    try {
        auth = JSON.parse(raw);
    } catch {
        status.reason = "cli-auth.json is invalid";
        return status;
    }
    if (!auth.port || !auth.token) {
        status.reason = "cli-auth.json is incomplete";
        return status;
    }
    status.port = auth.port;
    const token = auth.token;
    status.tokenMasked = token.length > 8 ? token.slice(0, 4) + "…" + token.slice(-4) : "****";
    // probe the API endpoint with the token
    try {
        const r = spawnSync(
            process.execPath,
            ["-e", `
                const http = require('http');
                const req = http.request({
                    host: '127.0.0.1', port: ${auth.port},
                    path: '/api/plugin/list', method: 'GET',
                    headers: { Authorization: 'Bearer ' + ${JSON.stringify(token)} },
                    timeout: 2000,
                }, res => { process.exit(res.statusCode === 200 ? 0 : 1); });
                req.on('error', () => process.exit(1));
                req.on('timeout', () => process.exit(1));
                req.end();
            `],
            {encoding: "utf-8", timeout: 5000},
        );
        if (r.status === 0) {
            status.running = true;
        } else {
            status.reason = "service not responding on port " + auth.port;
        }
    } catch {
        status.reason = "service probe failed";
    }
    return status;
}
