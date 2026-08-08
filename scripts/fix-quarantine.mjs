#!/usr/bin/env node
/**
 * fix-quarantine — 移除 Electron.app 的 com.apple.quarantine 属性
 *
 * 背景：当项目经 AirDrop/共享拷贝到 Mac 时，node_modules/electron 会带上
 * com.apple.quarantine 标记，macOS Gatekeeper 会拦截未签名的 Electron
 * 二进制（SIGKILL / 提示“Electron”已损坏），导致开发模式无法启动。
 *
 * 用法：node scripts/fix-quarantine.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TARGETS = ["node_modules/electron/dist/Electron.app", "node_modules/electron"];

function hasQuarantine(p) {
  try {
    const out = execSync(`xattr -r "${p}" 2>/dev/null || true`, { encoding: "utf8" });
    return out.includes("com.apple.quarantine");
  } catch {
    return false;
  }
}

function removeQuarantine(p) {
  try {
    execSync(`xattr -dr com.apple.quarantine "${p}" 2>/dev/null || true`, { stdio: "ignore" });
    // provenance 属性也可能导致复制/签名异常，一并清理
    execSync(`xattr -dr com.apple.provenance "${p}" 2>/dev/null || true`, { stdio: "ignore" });
  } catch {}
}

let changed = false;
for (const rel of TARGETS) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  if (hasQuarantine(p)) {
    removeQuarantine(p);
    console.log(`[fix-quarantine] 已移除 quarantine: ${rel}`);
    changed = true;
  }
}

if (!changed) {
  console.log("[fix-quarantine] 未发现 quarantine 标记，无需处理");
} else {
  console.log("[fix-quarantine] 完成，Electron 可正常运行");
}
