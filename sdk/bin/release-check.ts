#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

interface Config {
    development?: {
        env?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

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
            "💡 Or specify a custom configuration file path: npx focusany-sdk-release-check path/to/config.json"
        );
    }
    process.exit(1);
}

console.log("🎉 Release check completed");
