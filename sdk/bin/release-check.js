#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 获取命令行参数
const args = process.argv.slice(2);
const customConfigPath = args[0];
// 获取调用此命令的项目根目录（而不是 SDK 包的目录）
const cwd = process.cwd();
const configPath = customConfigPath
    ? path.resolve(cwd, customConfigPath)
    : path.resolve(cwd, "dist/config.json");
console.log("🔍 FocusAny SDK Release Check");
if (customConfigPath) {
    console.log(`使用自定义配置文件路径: ${customConfigPath}`);
}
console.log(`检查配置文件: ${configPath}`);
if (fs.existsSync(configPath)) {
    try {
        const configContent = fs.readFileSync(configPath, "utf-8");
        const json = JSON.parse(configContent);
        if (json.development && json.development.env === "dev") {
            console.warn(`⚠️ 检测到 config.json 中的 env 字段为 "dev"，已将其修改为 "prod"`);
            json.development.env = "prod";
            fs.writeFileSync(configPath, JSON.stringify(json, null, 4), "utf-8");
            console.log("✅ 配置文件已更新");
        }
        else {
            console.log("✅ 配置检查通过，env 字段已为生产环境配置");
        }
    }
    catch (error) {
        console.error("❌ 读取或解析配置文件时出错:", error.message);
        process.exit(1);
    }
}
else {
    console.warn(`⚠️ 未找到配置文件 ${configPath}`);
    if (customConfigPath) {
        console.log("💡 请检查提供的配置文件路径是否正确");
    }
    else {
        console.log("💡 请确保在包含 dist/config.json 的项目根目录中运行此命令");
        console.log("💡 或者指定自定义配置文件路径: npx focusany-sdk-release-check path/to/config.json");
    }
    process.exit(1);
}
console.log("🎉 Release check 完成");
