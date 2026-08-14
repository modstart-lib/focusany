#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import { spawnSync } from "child_process";
import {
    locateFocusanyCli,
    findFocusanyApp,
    checkService,
} from "./find-focusany";

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

// Command handler for status — diagnose the local FocusAny environment
function status() {
    const app = findFocusanyApp();
    const cli = locateFocusanyCli();
    const service = checkService();

    console.log("🔍 FocusAny Status");
    console.log(`  app:          ${app.path || "not found"}`);
    if (cli.path) {
        console.log(`  cli:          ${cli.path} (${cli.source})`);
    } else {
        console.log("  cli:          not found");
        console.log(
            "  hint:         install FocusAny, put its CLI on PATH, or set FOCUSANY_CLI"
        );
    }
    console.log(`  dataRoot:     ${service.dataRoot}`);
    if (service.running) {
        console.log(`  service:      running (port ${service.port})`);
    } else {
        console.log(`  service:      not running${service.reason ? " — " + service.reason : ""}`);
    }

    let problems = 0;
    if (!app.path) {
        console.log("  ⚠ FocusAny desktop app is not installed");
        problems++;
    }
    if (!cli.path) {
        console.log("  ⚠ FocusAny CLI binary is not found");
        problems++;
    }
    if (!service.running) {
        console.log("  ⚠ FocusAny service is not running");
        problems++;
    }
    if (problems > 0) {
        process.exit(1);
    }
    console.log("✅ All checks passed");
}

// Command handler for cli — find the local focusany CLI and forward all args
function cliForward(args: string[]) {
    let cliOverride: string | undefined;
    const passthrough: string[] = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--cli") {
            cliOverride = args[++i];
        } else {
            passthrough.push(args[i]);
        }
    }

    const located = locateFocusanyCli({ cli: cliOverride });
    if (!located.path) {
        if (cliOverride) {
            console.error(`❌ FocusAny CLI not found at --cli path: ${cliOverride}`);
        } else {
            console.error(
                "❌ FocusAny CLI not found. Install FocusAny, put its CLI on PATH, " +
                "or pass --cli <path>."
            );
        }
        process.exit(1);
    }

    const result = spawnSync(located.path, passthrough, { stdio: "inherit" });
    if (result.error) {
        console.error(`❌ Failed to run FocusAny CLI: ${result.error.message}`);
        process.exit(1);
    }
    process.exit(result.status === null ? 1 : result.status);
}

// Command handler for help
function showHelp() {
    console.log(`
🚀 FocusAny SDK CLI

Usage:
  npx focusany <command> [options]

Commands:
  release-prepare [path]  Check and update config.json for production release
  cli <args...>        Forward args to the local FocusAny CLI (e.g. "cli plugin list")
                       Options: --cli <path> to override the CLI binary location
  status               Check the local FocusAny environment (app, CLI, service)
  version              Display the current version of FocusAny SDK
  help                 Show this help message

Examples:
  npx focusany release-prepare
  npx focusany release-prepare path/to/config.json
  npx focusany cli plugin list
  npx focusany cli doctor
  npx focusany cli --cli /opt/focusany/focusany mcp tools
  npx focusany status
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
        case "cli":
            cliForward(args);
            break;
        case "status":
            status();
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
