import type { Request, Response } from "express";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { AppEnv } from "../env";
import { Log } from "../log/main";
import { Manager } from "../manager/manager";

let server: http.Server | null = null;
let isRunning = false;
let runningPort = 0;
let runningToken = "";

const getAvailablePort = (): Promise<number> => {
    return new Promise((resolve, reject) => {
        const s = http.createServer();
        s.listen(0, "127.0.0.1", () => {
            const addr = s.address() as { port: number };
            const port = addr.port;
            s.close(() => resolve(port));
        });
        s.on("error", reject);
    });
};

const generateToken = (): string => {
    return (
        crypto.randomUUID().replace(/-/g, "") +
        crypto.randomUUID().replace(/-/g, "")
    );
};

const writeCliAuthFile = (port: number, token: string): void => {
    try {
        const filePath = path.join(AppEnv.userData, "cli-auth.json");
        fs.writeFileSync(filePath, JSON.stringify({ port, token }), "utf-8");
    } catch (e) {
        Log.error("httpserver.writeCliAuthFile.error", e);
    }
};

const sendJson = (res: Response, statusCode: number, data: any) => {
    res.status(statusCode).json(data);
};

const createApp = (port: number, token: string) => {
    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
        );
        if (_req.method === "OPTIONS") {
            res.status(200).end();
            return;
        }
        next();
    });

    app.use((_req, res, next) => {
        const auth = _req.headers["authorization"] || "";
        if (!auth.startsWith("Bearer ") || auth.slice(7) !== token) {
            sendJson(res, 401, { code: -1, msg: "Unauthorized" });
            return;
        }
        next();
    });

    app.get("/api/plugin/list", async (_req: Request, res: Response) => {
        try {
            const plugins = await Manager.listPlugin();
            const list = plugins.map((p) => ({
                name: p.name,
                title: p.title,
                version: p.version,
                logo: p.logo,
                type: p.type,
                description: p.description || "",
            }));
            sendJson(res, 200, { code: 0, data: { list } });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) });
        }
    });

    return app;
};

export const HttpServer = {
    async start() {
        if (isRunning) {
            return;
        }
        try {
            const port = await getAvailablePort();
            const token = generateToken();
            const app = createApp(port, token);
            server = http.createServer(app);
            await new Promise<void>((resolve, reject) => {
                server!.listen(port, "127.0.0.1", () => resolve());
                server!.on("error", reject);
            });
            runningPort = port;
            runningToken = token;
            isRunning = true;
            writeCliAuthFile(port, token);
            Log.info("httpserver.start", { port });
        } catch (e) {
            Log.error("httpserver.start.error", e);
        }
    },

    stop() {
        if (server) {
            server.close();
            server = null;
            isRunning = false;
            runningPort = 0;
            runningToken = "";
        }
    },

    getPort() {
        return runningPort;
    },

    getToken() {
        return runningToken;
    },
};
