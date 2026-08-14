#!/usr/bin/env node

/**
 * test-find-focusany.js — test the FocusAny CLI locator + service check
 * without requiring a real FocusAny installation.
 *
 * Run from the SDK root:  node tests/test-find-focusany.js
 */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { locateFocusanyCli, getFocusanyDataRoot } = require("../bin/find-focusany");

// ── helpers ──────────────────────────────────────────────────────

function makeExecutable(name) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "focusany-sdk-"));
    const p = path.join(dir, name);
    fs.writeFileSync(p, "#!/bin/sh\nexit 0\n");
    fs.chmodSync(p, 0o755);
    return p;
}

let passed = 0;
function ok(cond, msg) {
    assert.ok(cond, msg);
    passed++;
    console.log(`  ok  ${msg}`);
}

// ── locateFocusanyCli ────────────────────────────────────────────

console.log("locateFocusanyCli");

// --cli explicit path (exists) → source "arg"
const cliArg = makeExecutable("focusany");
const resArg = locateFocusanyCli({ cli: cliArg });
ok(resArg.path === cliArg, "explicit --cli path is returned");
ok(resArg.source === "arg", "explicit --cli source is 'arg'");

// --cli explicit path (missing) → null + source "arg" (strict, no fallback)
const resMissing = locateFocusanyCli({ cli: "/nonexistent/focusany-binary" });
ok(resMissing.path === null, "missing --cli path returns null");
ok(resMissing.source === "arg", "missing --cli source is still 'arg'");

// FOCUSANY_CLI env var
const cliEnv = makeExecutable("focusany");
const oldEnv = process.env.FOCUSANY_CLI;
process.env.FOCUSANY_CLI = cliEnv;
const resEnv = locateFocusanyCli();
ok(resEnv.path === cliEnv, "FOCUSANY_CLI env path is returned");
ok(resEnv.source === "env", "FOCUSANY_CLI source is 'env'");
if (oldEnv === undefined) {
    delete process.env.FOCUSANY_CLI;
} else {
    process.env.FOCUSANY_CLI = oldEnv;
}

// PATH lookup: put a fake focusany on PATH
const pathBinDir = fs.mkdtempSync(path.join(os.tmpdir(), "focusany-sdk-path-"));
const fakeCli = path.join(pathBinDir, "focusany");
fs.writeFileSync(fakeCli, "#!/bin/sh\nexit 0\n");
fs.chmodSync(fakeCli, 0o755);
const oldPath = process.env.PATH;
process.env.PATH = pathBinDir + path.delimiter + oldPath;
const resPath = locateFocusanyCli();
ok(resPath.path === fakeCli, "focusany on PATH is found");
ok(resPath.source === "path", "PATH source is 'path'");
process.env.PATH = oldPath;

// nothing found → null
const resNone = locateFocusanyCli({ cli: "/nonexistent/focusany-binary" });
ok(resNone.path === null, "no locatable CLI returns null");

// ── getFocusanyDataRoot ──────────────────────────────────────────

console.log("getFocusanyDataRoot");

// FOCUSANY_DATA_ROOT wins
const oldDataRoot = process.env.FOCUSANY_DATA_ROOT;
process.env.FOCUSANY_DATA_ROOT = "/tmp/custom-data-root";
ok(getFocusanyDataRoot() === "/tmp/custom-data-root", "FOCUSANY_DATA_ROOT wins");
if (oldDataRoot === undefined) {
    delete process.env.FOCUSANY_DATA_ROOT;
} else {
    process.env.FOCUSANY_DATA_ROOT = oldDataRoot;
}

// default fallback
ok(
    getFocusanyDataRoot() === path.join(os.homedir(), ".focusany", "data"),
    "default data root is ~/.focusany/data"
);

// ── summary ──────────────────────────────────────────────────────

console.log(`\n🎉 All ${passed} tests passed`);
process.exit(0);
