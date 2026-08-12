#!/usr/bin/env node
/**
 * update-version — 更新项目版本号（package.json / package-lock.json）
 *
 * 用法：node scripts/update-version.mjs 2.1.0
 *       或 make update-version VERSION=2.1.0 / make update-version 2.1.0
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const arg = process.argv[2] || "";
const version = arg.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`❌ 无效版本号 "${arg}"，需为 x.y.z 格式（如 2.1.0，可带 v 前缀）`);
  process.exit(1);
}

const setVersion = (obj, keys) => {
  let parent = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    parent = parent?.[keys[i]];
    if (!parent) return false;
  }
  const key = keys[keys.length - 1];
  if (parent[key] === version) return false;
  parent[key] = version;
  return true;
};

const pkgPath = path.join(ROOT, "package.json");
const lockPath = path.join(ROOT, "package-lock.json");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));

let changed = false;
changed = setVersion(pkg, ["version"]) || changed;
changed = setVersion(lock, ["version"]) || changed;
changed = setVersion(lock, ["packages", "", "version"]) || changed;

if (!changed) {
  console.log(`版本号已是 ${version}，无需修改`);
  process.exit(0);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + "\n");
fs.writeFileSync(lockPath, JSON.stringify(lock, null, 4) + "\n");
console.log(`✅ 版本号已更新为 ${version}（package.json / package-lock.json）`);
console.log(`   如需重新构建 CLI：make build-cli`);
