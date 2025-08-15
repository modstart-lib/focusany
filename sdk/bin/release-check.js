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
// Get command line arguments
const args = process.argv.slice(2);
const customConfigPath = args[0];
// Get the project root directory that calls this command (not the SDK package directory)
const cwd = process.cwd();
const configPath = customConfigPath
    ? path.resolve(cwd, customConfigPath)
    : path.resolve(cwd, "dist/config.json");
console.log("🔍 FocusAny SDK Release Check");
if (customConfigPath) {
    console.log(`Using custom config file path: ${customConfigPath}`);
}
console.log(`Checking config file: ${configPath}`);
if (fs.existsSync(configPath)) {
    try {
        const configContent = fs.readFileSync(configPath, "utf-8");
        const json = JSON.parse(configContent);
        if (json.development && json.development.env === "dev") {
            console.warn(`⚠️ Detected env field in config.json is "dev", it has been changed to "prod"`);
            json.development.env = "prod";
            fs.writeFileSync(configPath, JSON.stringify(json, null, 4), "utf-8");
            console.log("✅ Configuration file has been updated");
        }
        else {
            console.log("✅ Configuration check passed, env field is already set for production environment");
        }
    }
    catch (error) {
        console.error("❌ Error reading or parsing configuration file:", error.message);
        process.exit(1);
    }
}
else {
    console.warn(`⚠️ Configuration file not found ${configPath}`);
    if (customConfigPath) {
        console.log("💡 Please check if the provided configuration file path is correct");
    }
    else {
        console.log("💡 Please make sure to run this command in the project root directory that contains dist/config.json");
        console.log("💡 Or specify a custom configuration file path: npx focusany-sdk-release-check path/to/config.json");
    }
    process.exit(1);
}
console.log("🎉 Release check completed");
