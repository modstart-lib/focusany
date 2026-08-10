// afterPack hook: verify extra resources are correctly placed in the app bundle.
//
// electron-builder packages electron/resources/extra/ -> Resources/extra/ (macOS)
// or resources/extra/ (win/linux).
// This script verifies the packaged resources exist and logs them for debugging.

const common = require("./common.cjs");
const fs = require("node:fs");
const path = require("node:path");

// ── helpers ──────────────────────────────────────────────────────
function resolveApp(context, ...segments) {
  const pn = common.platformName();
  if (pn === "osx") {
    return common.pathResolve(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      "Contents",
      "Resources",
      ...segments
    );
  }
  return common.pathResolve(context.appOutDir, "resources", ...segments);
}

function walkFiles(dir, callback) {
  if (!common.exists(dir)) return;
  for (const item of fs.readdirSync(dir)) {
    const file = path.join(dir, item);
    const stat = fs.lstatSync(file);
    callback(file, stat);
    if (stat.isDirectory() && common.exists(file)) {
      walkFiles(file, callback);
    }
  }
}

function formatBytes(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function dirSize(dir) {
  let total = 0;
  walkFiles(dir, (_, stat) => {
    if (!stat.isDirectory()) total += stat.size;
  });
  return total;
}

// ── main ─────────────────────────────────────────────────────────
exports.default = async function (context) {
  console.log("BuildOptimize", {name: common.platformName(), arch: common.platformArch()});

  // macOS 本地构建版：
  // - 钥匙串已导入 Developer ID 证书时，electron-builder 随后会用证书签名，
  //   授权记录按 TeamID 匹配，重装/升级后授权可持久，无需 adhoc 覆盖。
  // - 无证书（identity=null，不签名）时，用 ad-hoc 重新签名并指定 appId，使签名
  //   identifier 与 bundle 一致，避免 TCC 辅助功能/屏幕录制授权失效；同时保留
  //   hardened runtime 与 entitlements。
  if (common.platformName() === "osx" && process.env.FOCUSANY_LOCAL_INSTALL === "1") {
    const appDir = common.pathResolve(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
    );
    const hasCert = (() => {
      try {
        const out = require("node:child_process").execSync(
          `security find-identity -v -p codesigning 2>&1`,
          {encoding: "utf8"},
        );
        return /Developer ID Application/.test(out);
      } catch (e) {
        return false;
      }
    })();
    if (hasCert) {
      console.log("  [sign] 钥匙串已检测到 Developer ID 证书，跳过 adhoc 重新签名");
    } else {
      const appId = context.packager.appInfo.appId || "com.focusany.app";
      const entitlementsPath = require("node:path").resolve(__dirname, "..", "entitlements.mac.plist");
      const exec = require("node:child_process").execSync;
      try {
        exec(
          `codesign --force --deep --sign - --identifier ${appId} --options runtime --entitlements "${entitlementsPath}" "${appDir}"`,
          {stdio: "pipe"},
        );
        const sig = exec(
          `codesign -dv "${appDir}" 2>&1 | grep Identifier`,
          {encoding: "utf8"},
        );
        console.log(`  [sign] local build re-signed (${sig.trim()})`);
      } catch (e) {
        console.error("  [error] local build re-sign failed:", e.message);
      }
    }
  }

  const extraDir = resolveApp(context, "extra");
  console.log(`  [check] extra dir: ${extraDir}`);

  if (!common.exists(extraDir)) {
    console.log("  [warn] extra dir not found, skipping verification");
    return;
  }

  // Log all files in extra/
  console.log("  [contents] extra/ files:");
  walkFiles(extraDir, (file, stat) => {
    const rel = path.relative(extraDir, file);
    console.log(`    ${stat.isDirectory() ? "D:" : "F:"} ${rel}${stat.isDirectory() ? "/" : ""} (${stat.isDirectory() ? "" : formatBytes(stat.size)})`);
  });

  console.log(`  [check] extra size: ${formatBytes(dirSize(extraDir))}`);
  console.log("  [done] BuildOptimize complete");
};
