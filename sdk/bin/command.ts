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

    console.log("🔍 FocusAny SDK Release Prepare");
    if (customConfigPath) {
        console.log(`Using custom config file path: ${customConfigPath}`);
    }
    console.log(`Checking config file: ${configPath}`);

    if (fs.existsSync(configPath)) {
        try {
            const configContent = fs.readFileSync(configPath, "utf-8");
            const json: Config = JSON.parse(configContent);

            if (json.development && json.development.env === "dev") {
                console.warn(
                    `⚠️ Detected env field in config.json is "dev", it has been changed to "prod"`
                );
                json.development.env = "prod";
                fs.writeFileSync(
                    configPath,
                    JSON.stringify(json, null, 4),
                    "utf-8"
                );
                console.log("✅ Configuration file has been updated");
            } else {
                console.log("✅ Configuration check passed, env field is already set for production environment");
            }
        } catch (error) {
            console.error("❌ Error reading or parsing configuration file:", (error as Error).message);
            process.exit(1);
        }
    } else {
        console.warn(`⚠️ Configuration file not found ${configPath}`);
        if (customConfigPath) {
            console.log("💡 Please check if the provided configuration file path is correct");
        } else {
            console.log(
                "💡 Please make sure to run this command in the project root directory that contains dist/config.json"
            );
            console.log(
                "💡 Or specify a custom configuration file path: npx focusany release-prepare path/to/config.json"
            );
        }
        process.exit(1);
    }

    console.log("🎉 Release prepare completed");
}

// Command handler for version
function version() {
    try {
        const packageJsonPath = path.resolve(__dirname, "../package.json");
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        console.log(`🔖 FocusAny SDK Version: ${packageJson.version}`);
    } catch (error) {
        console.error("❌ Error reading version information:", (error as Error).message);
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
}

// Execute the main function
main();