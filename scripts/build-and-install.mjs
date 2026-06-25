/**
 * build-and-install.mjs — Build and install FocusAny on the current system.
 *
 * Usage: node scripts/build-and-install.mjs
 *
 * Flow:
 *   1. Kill running FocusAny processes
 *   2. Run a full local build without code signing
 *   3. Detect build artifacts
 *   4. Install to the system path
 *
 * Supported platforms:
 *   - macOS: copy .app to /Applications
 *   - Windows: run NSIS installer or copy portable directory
 *   - Linux: copy AppImage or install deb
 */

import {execSync, spawnSync} from 'node:child_process';
import {existsSync, readdirSync} from 'node:fs';
import {resolve, dirname, join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {arch as osArch, platform as osPlatform, homedir} from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Utilities ─────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  const {cwd = ROOT, stdio = 'inherit', timeout = 600_000, env = {}} = opts;
  console.log(`  → ${cmd}`);
  try {
    execSync(cmd, {cwd, stdio, timeout, shell: true, env: {...process.env, ...env}});
  } catch (e) {
    console.error(`\n✖ 命令失败 (exit ${e.status}): ${cmd}`);
    if (e.stderr) process.stderr.write(e.stderr.toString().trim() + '\n');
    process.exit(1);
  }
}

function spawn(cmd, args, opts = {}) {
  const {cwd = ROOT, stdio = 'inherit', timeout = 600_000} = opts;
  console.log(`  → ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {cwd, stdio, timeout});
  if (result.error) {
    console.error(`\n✖ 命令失败: ${cmd} ${args.join(' ')}`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\n✖ 命令退出码 ${result.status}: ${cmd} ${args.join(' ')}`);
    process.exit(result.status);
  }
  return result;
}

function step(msg) {
  console.log(`\n─── ${msg} ───`);
}

// ── Step 1: Clean up running processes ────────────────────────────

function killRunningInstances() {
  step('清理残留进程');

  if (osPlatform() === 'darwin') {
    // Kill FocusAny.app and related local processes.
    try { execSync('pkill -9 -f "FocusAny.app" 2>/dev/null || true', {stdio: 'ignore'}); } catch {}
    try { execSync('pkill -9 -f "focusany" 2>/dev/null || true', {stdio: 'ignore'}); } catch {}
    // Wait until processes exit, up to 10 seconds.
    try {
      execSync(
        'for i in $(seq 1 20); do pgrep -q "FocusAny" || break; sleep 0.5; done',
        {stdio: 'ignore', timeout: 15_000, shell: true}
      );
    } catch {}
  } else if (osPlatform() === 'win32') {
    try { execSync('taskkill /f /im "FocusAny.exe" 2>nul || ver >nul', {stdio: 'ignore'}); } catch {}
  } else {
    try { execSync('pkill -9 -f "focusany" 2>/dev/null || true', {stdio: 'ignore'}); } catch {}
  }

  console.log('  ✓ 残留进程清理完成');
}

// ── Step 2: Build project ─────────────────────────────────────────

function buildProject() {
  step('构建项目');
  run('npm run build', {
    env: {
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      FOCUSANY_LOCAL_INSTALL: '1',
    },
  });
  console.log('  ✓ 构建完成');
}

// ── Step 3: Detect build artifacts ────────────────────────────────

function detectDistRelease() {
  step('检测构建产物');

  const distReleaseDir = join(ROOT, 'dist-release');
  if (!existsSync(distReleaseDir)) {
    console.error('✖ dist-release/ 目录不存在，构建可能失败');
    process.exit(1);
  }
  return distReleaseDir;
}

function findAppBundle(distReleaseDir) {
  const platform = osPlatform();
  const arch = osArch();

  if (platform === 'darwin') {
    const archLabel = arch === 'arm64' ? 'arm64' : '';
    const subDirs = [
      `mac-${archLabel}`,
      archLabel ? null : 'mac-x64',
      'mac-arm64',
      'mac',
    ].filter(Boolean);
    for (const sub of subDirs) {
      const candidate = join(distReleaseDir, sub, 'FocusAny.app');
      if (existsSync(candidate)) return candidate;
    }
  } else if (platform === 'win32') {
    // Find installer or portable exe.
    const searchDirs = [distReleaseDir];
    const archLabel = arch === 'arm64' ? 'arm64' : 'x64';
    for (const sub of ['', `win-${archLabel}`, 'win']) {
      if (sub) searchDirs.push(join(distReleaseDir, sub));
    }
    for (const dir of searchDirs) {
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir)) {
        const full = join(dir, f);
        if (f.endsWith('.exe') && !f.endsWith('.blockmap')) return full;
      }
    }
  } else if (platform === 'linux') {
    const searchDirs = [distReleaseDir];
    const archLabel = arch === 'arm64' ? 'arm64' : 'x64';
    for (const sub of ['', `linux-${archLabel}`, 'linux']) {
      if (sub) searchDirs.push(join(distReleaseDir, sub));
    }
    for (const dir of searchDirs) {
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir)) {
        if (f.endsWith('.AppImage') || f.endsWith('.deb')) {
          return join(dir, f);
        }
      }
    }
  }

  return null;
}

// ── Step 4: Install to system ─────────────────────────────────────

function installOnMac(distReleaseDir) {
  const appBundle = findAppBundle(distReleaseDir);
  if (!appBundle) {
    console.error('✖ 未找到 .app 构建产物');
    console.error('  预期路径: dist-release/mac[-arm64]/FocusAny.app');
    process.exit(1);
  }

  const destDir = '/Applications/FocusAny.app';

  console.log(`  源路径: ${appBundle}`);
  console.log(`  目标路径: ${destDir}`);

  // Remove old version.
  if (existsSync(destDir)) {
    console.log('  移除旧版本...');
    spawn('/bin/rm', ['-rf', destDir]);
  }

  // Use ditto to preserve bundle metadata.
  console.log('  安装中...');
  spawn('/usr/bin/ditto', [appBundle, destDir]);

  // Verify installation.
  if (!existsSync(destDir)) {
    console.error('✖ 安装失败: 目标路径不存在');
    process.exit(1);
  }

  console.log('  ✓ FocusAny.app 已安装到 /Applications');
}

function installOnWin(distReleaseDir) {
  // Find installer package.
  const installer = findAppBundle(distReleaseDir);
  if (installer && (installer.endsWith('.exe') || installer.endsWith('.msi'))) {
    console.log(`  找到安装包: ${installer}`);
    console.log('  运行安装程序（请按向导操作）...');
    run(`start "" "${installer}"`, {stdio: 'ignore'});
    return;
  }

  // Try portable package: find a directory that contains FocusAny.exe.
  const archLabel = osArch() === 'arm64' ? 'arm64' : 'x64';
  for (const sub of [`win-${archLabel}`, 'win', '']) {
    const dir = sub ? join(distReleaseDir, sub) : distReleaseDir;
    if (!existsSync(dir)) continue;
    if (existsSync(join(dir, 'FocusAny.exe'))) {
      const destDir = join(process.env.ProgramFiles || 'C:\\Program Files', 'FocusAny');
      console.log(`  找到便携版: ${dir}`);
      console.log(`  复制到 ${destDir} ...`);
      execSync(`xcopy /E /I /Y "${dir}" "${destDir}"`, {stdio: 'inherit'});
      console.log(`  ✓ FocusAny 已安装到 ${destDir}`);
      return;
    }
  }

  console.error('✖ 未找到 Windows 构建产物 (exe/msi)');
  process.exit(1);
}

function installOnLinux(distReleaseDir) {
  const artifact = findAppBundle(distReleaseDir);

  if (artifact && artifact.endsWith('.AppImage')) {
    const destDir = join(homedir(), 'Applications');
    const destFile = join(destDir, basename(artifact));
    console.log(`  找到 AppImage: ${artifact}`);
    console.log(`  安装到 ${destFile} ...`);
    execSync(`mkdir -p '${destDir}'`, {stdio: 'inherit'});
    execSync(`/bin/cp '${artifact}' '${destDir}/'`, {stdio: 'inherit'});
    execSync(`chmod +x '${destFile}'`, {stdio: 'inherit'});
    console.log(`  ✓ FocusAny 已安装到 ${destFile}`);
    return;
  }

  if (artifact && artifact.endsWith('.deb')) {
    console.log(`  找到 deb 包: ${artifact}`);
    console.log('  使用 dpkg 安装（需要 sudo）...');
    run(`sudo dpkg -i '${artifact}'`);
    console.log('  ✓ FocusAny 已安装');
    return;
  }

  console.error('✖ 未找到 Linux 构建产物 (AppImage/deb)');
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────

function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   FocusAny 构建 & 安装               ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  平台: ${osPlatform()} (${osArch()})`);
  console.log(`  目录: ${ROOT}`);
  console.log();

  killRunningInstances();
  buildProject();
  const distReleaseDir = detectDistRelease();

  step('安装到系统');
  const platform = osPlatform();
  if (platform === 'darwin') {
    installOnMac(distReleaseDir);
  } else if (platform === 'win32') {
    installOnWin(distReleaseDir);
  } else if (platform === 'linux') {
    installOnLinux(distReleaseDir);
  } else {
    console.error(`✖ 不支持的平台: ${platform}`);
    process.exit(1);
  }

  console.log(`\n✔ 构建并安装完成！`);
}

main();
