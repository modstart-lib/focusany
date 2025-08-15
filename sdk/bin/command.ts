#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as process from "process";

interface Config {
    development?: {
        env?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

// Command handler for release-prepare
function releasePrepare(args: string[]) {
    const customConfigPath = args[0];

    // Get the project root directory that calls this command (not the SDK package directory)
    const cwd = process.cwd();
    const configPath = customConfigPath
        ? path.resolve(cwd, customConfigPath)
        : path.resolve(cwd, "dist/config.json");
    const configDir = path.dirname(configPath);

    console.log("🔍 Release Prepare");
    if (customConfigPath) {
        console.log(`Using custom config file path: ${customConfigPath}`);
    }
    console.log(`Checking config file: ${configPath}`);

    if (!fs.existsSync(configPath)) {
        console.warn(`❌ Configuration file not found ${configPath}`);
        process.exit(1);
    }
    let json: Config | null = null;
    let jsonChanged = false;
    try {
        const configContent = fs.readFileSync(configPath, "utf-8");
        json = JSON.parse(configContent);
    } catch (error) {
        console.error(
            "❌ Error reading or parsing configuration file:",
            (error as Error).message
        );
        process.exit(1);
    }
    if (!json) {
        console.error("❌ Error parsing configuration file, json is null");
        process.exit(1);
    }
    if (json.development && json.development.env === "dev") {
        console.warn(
            `⚠️ Detected env field in config.json is "dev", it has been changed to "prod"`
        );
        json.development.env = "prod";
        jsonChanged = true;
    }
    if (jsonChanged) {
        fs.writeFileSync(configPath, JSON.stringify(json, null, 4), "utf-8");
        console.log("✅ config.json file has been updated");
    }
    console.log("🎉 Release prepare completed");
}

// Command handler for version
function version() {
    try {
        const packageJsonPath = path.resolve(__dirname, "../package.json");
        const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf-8")
        );
        console.log(`🔖 FocusAny SDK Version: ${packageJson.version}`);
    } catch (error) {
        console.error(
            "❌ Error reading version information:",
            (error as Error).message
        );
        process.exit(1);
    }
}

// Command handler for help
function showHelp() {
    console.log(`
🚀 FocusAny SDK CLI

Usage:
  npx focusany <command> [options]

Commands:
  release-prepare [path]  Check and update config.json for production release
  version              Display the current version of FocusAny SDK
  help                 Show this help message

Examples:
  npx focusany release-prepare
  npx focusany release-prepare path/to/config.json
  npx focusany version
`);
}

// Main command router
function main() {
    const args = process.argv.slice(2);
    const command = args.shift() || "help";

    console.log("🚀 [FocusAny SDK] Start");
    switch (command) {
        case "release-prepare":
            releasePrepare(args);
            break;
        case "version":
            version();
            break;
        case "help":
            showHelp();
            break;
        default:
            console.error(`❌ Unknown command: ${command}`);
            showHelp();
            process.exit(1);
    }
    console.log("🚀 [FocusAny SDK] End");
}

// Execute the main function
main();
