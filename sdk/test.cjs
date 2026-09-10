#!/usr/bin/env node
/**
 * test.cjs — FocusAny 插件测试 / 截图基础库
 *
 * 提供 it/expect 风格的 Jest 式测试框架，以及 CLI 操作、插件操作、截图等全部基础能力。
 * 插件测试脚本直接 require 即可，无需 findSDKTestBase 等自发现逻辑。
 *
 * 用法：
 *   const { it, expect, run, cli, resolve, ... } = require('focusany-sdk/test');
 *
 *   it('插件安装成功', async () => {
 *     expect(await installPlugin(dir, name)).toBe(true)
 *   })
 *   it('UI 元素存在', () => {
 *     expect(evalPlugin('MyPlugin', 'document.title')).toBe('MyPlugin')
 *   })
 *
 *   run()  // 执行所有 it 测试并汇总退出
 *
 * 运行环境要求：
 *   - FocusAny 桌面端正在运行（CLI 依赖 cli-auth.json）
 *   - CLI 二进制可被 findCLI() 找到
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// ═════════════════════════════════════════════════════════════════
//  自发现
// ═════════════════════════════════════════════════════════════════

/**
 * resolve() — 返回 focusany-sdk 的根目录路径。
 * 插件测试脚本无需再写 findSDKTestBase，直接 require('focusany-sdk/test')
 * 即可，resolve() 提供 SDK 路径用于引用 SDK 内其他资源。
 */
function resolve() {
    return path.resolve(__dirname);
}

/**
 * findSDK() — 在常见开发路径中查找 focusany-sdk 目录。
 * 插件测试脚本可用此函数定位 SDK 路径，再 require 具体文件。
 *
 * 查找优先级：
 *   1. FOCUSANY_SDK 环境变量
 *   2. ~/store/project/focusany/focusany-pro/sdk（开发环境）
 *   3. 其他常见路径
 *
 * 用法：
 *   const sdkDir = require('focusany-sdk/test').findSDK()  // 已加载 SDK 时
 *   // 或独立使用：
 *   const { findSDK } = require(path_to_test_cjs)
 */
function findSDK() {
    if (process.env.FOCUSANY_SDK) {
        const p = path.resolve(process.env.FOCUSANY_SDK);
        if (fs.existsSync(path.join(p, 'test.cjs'))) return p;
    }
    // FocusAny.app 打包后的 SDK
    if (fs.existsSync('/Applications/FocusAny.app/Contents/Resources/sdk/test.cjs')) {
        return '/Applications/FocusAny.app/Contents/Resources/sdk';
    }
    if (fs.existsSync('/Applications/FocusAnyPro.app/Contents/Resources/sdk/test.cjs')) {
        return '/Applications/FocusAnyPro.app/Contents/Resources/sdk';
    }
    // 开发环境
    const candidates = [
        path.join(os.homedir(), 'store/project/focusany/focusany-pro/sdk'),
        path.join(os.homedir(), 'data/project/focusany/focusany-pro/sdk'),
    ];
    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, 'test.cjs'))) return dir;
    }
    return null;
}

// ═════════════════════════════════════════════════════════════════
//  CLI 定位与执行
// ═════════════════════════════════════════════════════════════════

const DEFAULT_DATA_ROOT = path.join(os.homedir(), 'data/env/runtime/focusany');

/** 查找 FocusAny CLI 二进制路径 */
function findCLI() {
    if (process.env.FOCUSANY_CLI && fs.existsSync(process.env.FOCUSANY_CLI)) {
        return process.env.FOCUSANY_CLI;
    }
    // 从 SDK 目录向上查找 dist-cli
    const sdkDir = resolve();
    const proDir = path.resolve(sdkDir, '..');
    const distCliDir = path.join(proDir, 'dist-cli');
    if (fs.existsSync(distCliDir)) {
        const name = archCliName();
        const p = path.join(distCliDir, name);
        if (fs.existsSync(p)) return p;
    }
    // 常见开发目录
    const candidates = [
        path.join(os.homedir(), 'store/project/focusany/focusany-pro/dist-cli'),
        path.join(os.homedir(), 'other/project/focusany/focusany-pro/dist-cli'),
        path.join(os.homedir(), 'data/project/focusany/focusany-pro/dist-cli'),
        path.join(os.homedir(), 'project/focusany/focusany-pro/dist-cli'),
    ];
    const name = archCliName();
    for (const dir of candidates) {
        if (!fs.existsSync(dir)) continue;
        const p = path.join(dir, name);
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function archCliName() {
    const platform = process.platform;
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    const ext = platform === 'win32' ? '.exe' : '';
    if (platform === 'win32') return `focusany-win-${arch}${ext}`;
    if (platform === 'darwin') return `focusany-darwin-${arch}${ext}`;
    return `focusany-linux-${arch}${ext}`;
}

function isServiceRunning(dataRoot) {
    const authPath = path.join(dataRoot, 'cli-auth.json');
    try {
        const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
        if (auth.port) {
            const r = spawnSync('lsof', ['-iTCP:' + auth.port, '-sTCP:LISTEN'], { encoding: 'utf-8', timeout: 2000 });
            return r.stdout && r.stdout.includes('LISTEN');
        }
    } catch { /* ignore */ }
    return false;
}

/** 检测 FOCUSANY_DATA_ROOT：自动探测哪个数据目录的服务正在运行 */
function detectDataRoot() {
    if (process.env.FOCUSANY_DATA_ROOT) return process.env.FOCUSANY_DATA_ROOT;
    // 先检查自定义数据目录
    if (fs.existsSync(DEFAULT_DATA_ROOT) && isServiceRunning(DEFAULT_DATA_ROOT)) {
        return DEFAULT_DATA_ROOT;
    }
    // 检查默认数据目录
    const defaultRoot = path.join(os.homedir(), '.focusany', 'data');
    if (fs.existsSync(defaultRoot) && isServiceRunning(defaultRoot)) {
        return '';
    }
    return '';
}

/** 构造 CLI 环境变量 */
function cliEnv() {
    const env = { ...process.env };
    const root = detectDataRoot();
    if (root) env.FOCUSANY_DATA_ROOT = root;
    return env;
}

let _cliPath = null;

/** 运行 focusany 命令，返回 { status, stdout, stderr } */
function cli(args, opts = {}) {
    _cliPath = _cliPath || findCLI();
    if (!_cliPath) throw new Error('找不到 focusany CLI，请设置环境变量 FOCUSANY_CLI 或先构建 dist-cli');
    const r = spawnSync(_cliPath, args, {
        encoding: 'utf8',
        env: cliEnv(),
        timeout: opts.timeout || 120000,
        cwd: opts.cwd,
    });
    return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

/** 运行命令并断言成功，返回 stdout */
function cliOK(args, opts = {}) {
    const r = cli(args, opts);
    if (r.status !== 0) {
        throw new Error(`focusany ${args.join(' ')} 失败(exit=${r.status})\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
    }
    return r.stdout;
}

/** 运行命令并把 stdout 解析为 JSON */
function cliJSON(args, opts = {}) {
    const out = cliOK(args, opts).trim();
    if (!out) throw new Error(`focusany ${args.join(' ')} 无输出（期望 JSON）`);
    try {
        return JSON.parse(out);
    } catch (e) {
        throw new Error(`focusany ${args.join(' ')} 输出不是 JSON: ${out.slice(0, 300)}`);
    }
}

// ═════════════════════════════════════════════════════════════════
//  Plugin 操作
// ═════════════════════════════════════════════════════════════════

/** 检查插件是否已安装 */
function isPluginInstalled(name) {
    const out = cli(['plugin', 'list']).stdout;
    return out.includes(`"name": "${name}"`);
}

/** 确保插件未安装 */
function ensurePluginNotInstalled(name) {
    if (isPluginInstalled(name)) {
        cliOK(['plugin', 'uninstall', name]);
    }
}

/** 安装插件（本地目录） */
function installPlugin(dir, name) {
    ensurePluginNotInstalled(name);
    cliOK(['plugin', 'install', dir, '--type', 'dir']);
    if (!isPluginInstalled(name)) {
        throw new Error(`插件 ${name} 安装后未出现在 plugin list`);
    }
}

/** 卸载插件 */
function uninstallPlugin(name) {
    if (isPluginInstalled(name)) {
        cliOK(['plugin', 'uninstall', name]);
    }
}

/** 启动插件并等待窗口出现 */
function runPlugin(name, timeoutMs = 30000) {
    cliOK(['plugin', 'run', name]);
    return waitFor(() => {
        const w = cliJSON(['plugin', 'windows', name]);
        return w.list && w.list.length > 0 ? w.list : null;
    }, 'plugin windows 可见', timeoutMs);
}

/** 关闭插件窗口 */
function closePlugin(name) {
    try { cli(['plugin', 'close', name]); } catch {}
}

/** 在插件窗口执行 JS 并返回结果文本。统一用 --file 临时文件避免转义问题 */
let _evalCounter = 0;
function evalPlugin(name, js) {
    const tmpFile = path.join(os.tmpdir(), 'fa-eval-' + process.pid + '-' + (++_evalCounter) + '.js');
    try {
        fs.writeFileSync(tmpFile, js, 'utf-8');
        const r = cli(['plugin', 'eval', name, '.', '--file', tmpFile]);
        return r.status === 0 ? r.stdout.trim() : null;
    } finally {
        try { fs.unlinkSync(tmpFile); } catch {}
    }
}

/** 截取插件窗口截图 */
function screenshotPlugin(name, outputPath) {
    if (outputPath) {
        cliOK(['plugin', 'screenshot', name, '-o', outputPath]);
    } else {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focusany-screenshot-'));
        outputPath = path.join(tmpDir, 'screenshot.png');
        cliOK(['plugin', 'screenshot', name, '-o', outputPath]);
        return outputPath;
    }
}

/** 等待指定文件存在 */
function waitForFile(filePath, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (fs.existsSync(filePath)) return true;
        sleep(200);
    }
    return false;
}

// ═════════════════════════════════════════════════════════════════
//  Expect 断言（Jest 风格）
// ═════════════════════════════════════════════════════════════════

function _fmt(v) {
    if (typeof v === 'string') return `"${v}"`;
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'object') return JSON.stringify(v, null, 2);
    return String(v);
}

/**
 * expect(value) — Jest 风格的断言链。
 * 支持 .toBe() / .not.toBe() / .toContain() / .toHaveLength() /
 *         .toHaveProperty() / .toBeGreaterThanOrEqual() / .toBeNull()
 *
 * 用法：
 *   expect(body.code).toBe(0)
 *   expect(body.data.range).toBe('today')
 *   expect(body.data.points).toHaveLength(1)
 *   expect(body.data.points[0].successCount).toBeGreaterThanOrEqual(1)
 *   expect(body.data.points[0]).toHaveProperty('date')
 */
function expect(actual) {
    return {
        toBe(expected) {
            const a = JSON.stringify(actual);
            const e = JSON.stringify(expected);
            if (a !== e) {
                throw new Error(`期望 ${_fmt(expected)}，实际 ${_fmt(actual)}`);
            }
        },
        not: {
            toBe(expected) {
                const a = JSON.stringify(actual);
                const e = JSON.stringify(expected);
                if (a === e) {
                    throw new Error(`不应为 ${_fmt(actual)}`);
                }
            },
        },
        toContain(substr) {
            if (typeof actual !== 'string' || !actual.includes(substr)) {
                const msg = typeof actual === 'string' ? actual.slice(0, 500) : _fmt(actual);
                throw new Error(`期望包含 ${_fmt(substr)}，实际 ${msg}`);
            }
        },
        toHaveLength(n) {
            const len = actual && typeof actual.length === 'number' ? actual.length : 'undefined';
            if (len !== n) {
                throw new Error(`期望长度为 ${n}，实际 ${len}`);
            }
        },
        toHaveProperty(key) {
            if (!actual || typeof actual !== 'object' || !(key in actual)) {
                throw new Error(`期望对象有属性 ${key}，实际 ${_fmt(actual)}`);
            }
        },
        toBeGreaterThanOrEqual(n) {
            if (typeof actual !== 'number' || actual < n) {
                throw new Error(`期望 >= ${n}，实际 ${_fmt(actual)}`);
            }
        },
        toBeNull() {
            if (actual !== null) {
                throw new Error(`期望 null，实际 ${_fmt(actual)}`);
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`期望 truthy，实际 ${_fmt(actual)}`);
            }
        },
    };
}

// ═════════════════════════════════════════════════════════════════
//  测试框架（Jest 风格：it 收集 -> run 执行）
// ═════════════════════════════════════════════════════════════════

const _tests = [];

/**
 * it(description, fn) — 定义一个测试用例。
 * 测试不会立即执行，而是被收集，直到 run() 被调用时按顺序执行。
 *
 * 用法：
 *   it('测试描述', async () => {
 *     expect(x).toBe(y)
 *   })
 */
function it(description, fn) {
    _tests.push({ description, fn });
}

/**
 * run() — 按顺序执行所有 it 测试用例，汇总结果并退出进程。
 * 应在脚本末尾调用一次。
 *
 * 用法：
 *   run().catch(e => { process.exit(1) })
 */
async function run() {
    const startedAt = Date.now();
    const failures = [];
    let passed = 0;

    const total = _tests.length;
    process.stdout.write(`\n开始测试（${total} 项）...\n`);

    for (const t of _tests) {
        process.stdout.write(`  · ${t.description} ... `);
        try {
            await t.fn();
            process.stdout.write('PASS\n');
            passed++;
        } catch (e) {
            process.stdout.write('FAIL\n');
            failures.push({ description: t.description, error: e });
        }
    }

    const duration = ((Date.now() - startedAt) / 1000).toFixed(1);

    if (failures.length === 0) {
        process.stdout.write(`\n✓ 全部 ${total} 项通过（用时 ${duration}s）\n`);
        process.exit(0);
    } else {
        process.stdout.write(`\n✗ ${failures.length} 项失败（用时 ${duration}s）：\n`);
        for (const f of failures) {
            process.stdout.write(`\n  [${f.description}]\n  ${f.error}\n`);
        }
        process.exit(1);
    }
}

// ═════════════════════════════════════════════════════════════════
//  工具函数
// ═════════════════════════════════════════════════════════════════

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function waitFor(fn, msg, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    let lastErr = null;
    while (Date.now() < deadline) {
        try {
            const v = await fn();
            if (v) return v;
        } catch (e) {
            lastErr = e;
        }
        await sleep(500);
    }
    throw new Error(`等待超时: ${msg}${lastErr ? `（最后错误: ${lastErr.message}）` : ''}`);
}

// ═════════════════════════════════════════════════════════════════
//  Debug API — 通过 /api/debug 获取插件调试数据
//  所有数据由 focusany-pro 后端在内存中采集，通过 HTTP API 获取
// ═════════════════════════════════════════════════════════════════

/**
 * _debugApi(plugin, type) — POST /api/debug 获取调试数据。
 * 内部自动读取 cli-auth.json 获取 token。
 * @returns {string[]} 调试数据列表（增量，获取后后端清空）
 */
function _debugApi(plugin, type) {
    const dataRoot = detectDataRoot() || path.join(os.homedir(), '.focusany', 'data');
    const authPath = path.join(dataRoot, 'cli-auth.json');
    try {
        const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
        if (!auth.port || !auth.token) return [];
        const body = JSON.stringify({ type, plugin });
        const r = spawnSync(process.execPath, ['-e', `
            const http = require('http');
            const body = ${JSON.stringify(body)};
            const opts = {
                host: '127.0.0.1', port: ${auth.port},
                path: '/api/debug',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    Authorization: 'Bearer ${auth.token}'
                },
                timeout: 5000,
            };
            const req = http.request(opts, (res) => {
                let b = '';
                res.on('data', (c) => b += c);
                res.on('end', () => { process.stdout.write(b); process.exit(0); });
            });
            req.on('error', () => process.exit(1));
            req.on('timeout', () => { req.destroy(); process.exit(1); });
            req.write(body);
            req.end();
        `], { encoding: 'utf-8', timeout: 5000 });
        if (r.status !== 0) return [];
        const parsed = JSON.parse(r.stdout);
        if (parsed.code === 0 && Array.isArray(parsed.data?.list)) {
            return parsed.data.list;
        }
        return [];
    } catch { return []; }
}

/**
 * getPluginViewErrors(name) — 获取插件 View 中发生的 console.error。
 * 返回自上次调用后的新增错误，读取后清空。
 */
function getPluginViewErrors(name) {
    return _debugApi(name, 'viewError');
}

/**
 * getPluginExternalRequest(name) — 获取插件 View 发起的外网请求。
 * 返回自上次调用后的新增请求 URL，读取后清空。
 */
function getPluginExternalRequest(name) {
    return _debugApi(name, 'externalRequest');
}

/**
 * getPluginMainErrors(name) — 获取与插件相关的主进程 ERROR 日志。
 * 返回自上次调用后的新增错误（增量读取）。
 */
function getPluginMainErrors(name) {
    return _debugApi(name, 'mainError');
}

/**
 * Assert that a plugin view has not emitted console errors.
 * @param {string} name - Plugin name
 * @param {string} label - Assertion context displayed on failure
 */
function assertNoViewErrors(name, label) {
    const errors = getPluginViewErrors(name);
    if (errors.length > 0) {
        throw new Error(`[${label}] View produced ${errors.length} console.error entries:\n` + errors.map(error => `  ${error}`).join('\n'));
    }
}

/**
 * Assert that the main process has not emitted plugin-related errors.
 * @param {string} name - Plugin name
 * @param {string} label - Assertion context displayed on failure
 * @param {{ignoreIncludes?: string[]}} [options] - Error messages to ignore
 */
function assertNoMainErrors(name, label, options = {}) {
    const ignoreIncludes = options.ignoreIncludes || [];
    const errors = getPluginMainErrors(name).filter(error => !ignoreIncludes.some(text => error.includes(text)));
    if (errors.length > 0) {
        throw new Error(`[${label}] Main process produced ${errors.length} ERROR entries:\n` + errors.map(error => `  ${error}`).join('\n'));
    }
}

/**
 * Assert that a plugin has not made unexpected external requests.
 * @param {string} name - Plugin name
 * @param {string} label - Assertion context displayed on failure
 * @param {{allowedPrefixes?: string[]}} [options] - Allowed URL prefixes
 */
function assertNoExternalRequests(name, label, options = {}) {
    const allowedPrefixes = options.allowedPrefixes || [];
    const unexpected = getPluginExternalRequest(name).filter(url => !allowedPrefixes.some(prefix => url.startsWith(prefix)));
    if (unexpected.length > 0) {
        throw new Error(`[${label}] Found ${unexpected.length} unexpected external requests:\n` + unexpected.map(url => `  ${url}`).join('\n'));
    }
}

/**
 * Wait briefly, then assert that the plugin view and main process are error-free.
 * @param {string} name - Plugin name
 * @param {string} label - Assertion context displayed on failure
 * @param {{delayMs?: number, ignoreMainErrorIncludes?: string[]}} [options] - Assertion options
 */
async function checkNoErrors(name, label, options = {}) {
    await sleep(options.delayMs ?? 500);
    assertNoViewErrors(name, label);
    assertNoMainErrors(name, label, { ignoreIncludes: options.ignoreMainErrorIncludes });
}

// ═════════════════════════════════════════════════════════════════
//  模型状态查询
// ═════════════════════════════════════════════════════════════════

/**
 * getModelStatus(name) — 读取插件页面的模型状态。
 * 支持两种模式：
 *   1. 原生模式：id="statusDot" 的 className
 *   2. React 模式：查找包含 bg-green-500 / bg-amber-500 / bg-red-500 的 span
 * 返回 'loading' | 'ready' | 'error' 或 null（无法获取时）
 */
function getModelStatus(name) {
    const raw = evalPlugin(name, `
        (function() {
            // 尝试原生模式
            var el = document.getElementById('statusDot');
            if (el) {
                var c = el.className || '';
                if (c.indexOf('ready') >= 0) return 'ready';
                if (c.indexOf('loading') >= 0 || c.indexOf('animate-pulse') >= 0) return 'loading';
                if (c.indexOf('error') >= 0) return 'error';
                return null;
            }
            // 尝试 React 模式（Tailwind 类名）
            var spans = document.querySelectorAll('span');
            for (var i = 0; i < spans.length; i++) {
                var c = spans[i].className || '';
                if (c.indexOf('bg-green-500') >= 0) return 'ready';
                if (c.indexOf('bg-amber-500') >= 0) return 'loading';
                if (c.indexOf('bg-red-500') >= 0) return 'error';
            }
            // Fallback: 读状态文字
            for (var i = 0; i < spans.length; i++) {
                var t = (spans[i].textContent || '').trim();
                if (t.indexOf('模型已就绪') >= 0) return 'ready';
                if (t.indexOf('下载模型') >= 0 || t.indexOf('加载模型') >= 0 || t.indexOf('正在初始化') >= 0) return 'loading';
                if (t.indexOf('模型加载失败') >= 0 || t.indexOf('模型下载失败') >= 0) return 'error';
            }
            return null;
        })()
    `);
    // evalPlugin returns string "null" when JS returns null
    if (!raw || raw === 'null') return null;
    return raw;
}

/**
 * waitForModelStatus(name, status, timeoutMs) — 等待模型进入指定状态。
 * @param {string} name - 插件名
 * @param {'loading'|'ready'|'error'} status - 期望状态
 * @param {number} timeoutMs - 超时时间（默认 60000）
 */
async function waitForModelStatus(name, status, timeoutMs = 60000) {
    return waitFor(() => {
        const s = getModelStatus(name);
        return s === status ? true : null;
    }, `模型状态变为 ${status}`, timeoutMs);
}

/**
 * 截取插件窗口并保存到指定目录
 * @param {string} name - 插件名
 * @param {string} label - 截图标签（用于文件名）
 * @param {string} outputDir - 输出目录
 * @returns {string} 截图文件路径
 */
function captureSnapshot(name, label, outputDir) {
    const filename = `${name}-${label}.png`;
    const outputPath = path.join(outputDir, filename);
    fs.mkdirSync(outputDir, { recursive: true });
    screenshotPlugin(name, outputPath);
    process.stdout.write(`  截图保存: ${outputPath}\n`);
    return outputPath;
}

// ═════════════════════════════════════════════════════════════════
//  导出
// ═════════════════════════════════════════════════════════════════

module.exports = {
    // 自发现
    resolve,
    findSDK,

    // CLI 操作
    findCLI,
    detectDataRoot,
    cli,
    cliOK,
    cliJSON,
    cliEnv,

    // 插件操作
    isPluginInstalled,
    ensurePluginNotInstalled,
    installPlugin,
    uninstallPlugin,
    runPlugin,
    closePlugin,
    evalPlugin,
    screenshotPlugin,
    waitForFile,

    // 断言（Jest 风格）
    expect,

    // 测试框架（Jest 风格：it 收集 -> run 执行）
    it,
    run,

    // 工具
    sleep,
    waitFor,

    // 截图
    captureSnapshot,

    // Debug API（通过后端 /api/debug 接口，增量采集）
    getPluginViewErrors,
    getPluginExternalRequest,
    getPluginMainErrors,
    assertNoViewErrors,
    assertNoMainErrors,
    assertNoExternalRequests,
    checkNoErrors,

    // 模型状态
    getModelStatus,
    waitForModelStatus,
};
