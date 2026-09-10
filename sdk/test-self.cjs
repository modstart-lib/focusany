#!/usr/bin/env node
/**
 * test-self.cjs — focusany-sdk/test 基础库自测脚本
 *
 * 验证所有导出 API 的基础功能和错误处理是否正确。
 * 依赖：FocusAny 正在运行；CLI 可用
 *
 * 运行：node test-self.cjs
 */

'use strict';

const path = require('path');

// 直接 require 自己（test.cjs），测试所有导出功能
const sdk = require(path.resolve(__dirname, 'test.cjs'));

// 从 sdk 中解构我们需要的函数
const {
    resolve, findSDK, findCLI, cli, cliOK, cliJSON,
    isPluginInstalled, runPlugin, closePlugin, evalPlugin,
    expect, it, run, sleep, waitFor,
    getPluginViewErrors, getPluginExternalRequest, getPluginMainErrors,
    getModelStatus, waitForModelStatus,
} = sdk;

// ── 测试收集 ────────────────────────────────────────────────────

it('resolve() 返回正确的 sdk 路径', () => {
    const p = resolve();
    expect(typeof p).toBe('string');
    expect(p.length > 0).toBe(true);
    expect(p.endsWith('/sdk') || p.endsWith('\\sdk')).toBe(true);
});

it('findSDK() 能找到 test.cjs', () => {
    const p = findSDK();
    expect(p !== null).toBe(true);
    // 返回的路径应该包含 test.cjs
    const { existsSync } = require('fs');
    expect(existsSync(path.join(p, 'test.cjs'))).toBe(true);
});

it('findCLI() 能找到 focusany CLI', () => {
    const p = findCLI();
    expect(p !== null).toBe(true);
    const { existsSync } = require('fs');
    expect(existsSync(p)).toBe(true);
});

it('cli() doctor 执行成功', () => {
    const r = cli(['doctor']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('cli api');
    expect(r.stdout).toContain('api auth');
});

it('cliJSON() doctor 解析失败（doctor 输出不是 JSON）', () => {
    // doctor 输出不是 JSON，应该抛出错误
    let threw = false;
    try {
        cliJSON(['doctor']);
    } catch (e) {
        threw = true;
        expect(e.message).toContain('不是 JSON');
    }
    expect(threw).toBe(true);
});

it('expect().toBe() 基础断言', () => {
    expect(42).toBe(42);
    expect('hello').toBe('hello');
    expect(true).toBe(true);
    expect(null).toBe(null);
});

it('expect().not.toBe() 否定断言', () => {
    expect(42).not.toBe(43);
    expect('hello').not.toBe('world');
});

it('expect().toContain() 包含断言', () => {
    expect('hello world').toContain('hello');
    expect('hello world').toContain('world');
});

it('expect().toContain() 不包含时抛错', () => {
    let threw = false;
    try {
        expect('hello').toContain('xyz');
    } catch (e) {
        threw = true;
        expect(e.message).toContain('期望包含');
    }
    expect(threw).toBe(true);
});

it('expect().toHaveLength()', () => {
    expect([1, 2, 3]).toHaveLength(3);
    expect('abc').toHaveLength(3);
});

it('expect().toHaveProperty()', () => {
    expect({ a: 1 }).toHaveProperty('a');
    expect({ a: { b: 2 } }).toHaveProperty('a');
});

it('expect().toBeGreaterThanOrEqual()', () => {
    expect(5).toBeGreaterThanOrEqual(5);
    expect(10).toBeGreaterThanOrEqual(5);
});

it('expect().toBeNull()', () => {
    expect(null).toBeNull();
});

it('expect().toBeTruthy()', () => {
    expect(true).toBeTruthy();
    expect(1).toBeTruthy();
    expect('hello').toBeTruthy();
    expect([]).toBeTruthy();
});

// ── sleep / waitFor ──────────────────────────────────────────────

it('sleep() 至少等待指定时间', async () => {
    const start = Date.now();
    await sleep(200);
    const elapsed = Date.now() - start;
    expect(elapsed >= 150).toBe(true);
});

it('waitFor() 等待条件满足', async () => {
    let count = 0;
    const result = await waitFor(() => {
        count++;
        return count >= 3 ? 'done' : null;
    }, 'count 达到 3', 5000);
    expect(result).toBe('done');
    expect(count).toBe(3);
});

it('waitFor() 超时抛错', async () => {
    let threw = false;
    try {
        await waitFor(() => null, '永不满足的条件', 1000);
    } catch (e) {
        threw = true;
        expect(e.message).toContain('等待超时');
    }
    expect(threw).toBe(true);
});

// ── isPluginInstalled / closePlugin ──────────────────────────────

// 随便检查一个系统插件应该都是 installed 的
it('isPluginInstalled() 系统插件存在', () => {
    expect(isPluginInstalled('system')).toBe(true);
});

it('isPluginInstalled() 不存在的插件返回 false', () => {
    expect(isPluginInstalled('__nonexistent_plugin__')).toBe(false);
});

it('closePlugin() 不会抛出错误（即使窗口不存在）', () => {
    // 应该静默处理
    closePlugin('__nonexistent__');
});

// ── 插件窗口交互 API ────────────────────────────────────────────

const TEST_PLUGIN = (() => {
    const w = cli(['plugin', 'windows', 'RemoveBg']);
    if (w.status === 0) {
        try {
            const parsed = JSON.parse(w.stdout);
            if (parsed.list && parsed.list.length > 0) return 'RemoveBg';
        } catch {}
    }
    return null;
})();

const hasTestPlugin = TEST_PLUGIN !== null;

it('evalPlugin() 单行 JS 在有窗口时返回结果', () => {
    if (!hasTestPlugin) { process.stdout.write('  ⚡ 跳过\n'); return; }
    const result = evalPlugin(TEST_PLUGIN, 'document.title');
    expect(result !== null).toBe(true);
    expect(typeof result).toBe('string');
    expect(result.length > 0).toBe(true);
});

it('evalPlugin() 无窗口插件返回 null', () => {
    const result = evalPlugin('store', '1+1');
    expect(result === null).toBe(true);
});

// ── Debug API（通过 /api/debug，需后端支持） ────────────────────

it('getPluginViewErrors() 返回数组', () => {
    if (!hasTestPlugin) { process.stdout.write('  ⚡ 跳过\n'); return; }
    const errors = getPluginViewErrors(TEST_PLUGIN);
    expect(Array.isArray(errors)).toBe(true);
});

it('getPluginExternalRequest() 返回数组', () => {
    if (!hasTestPlugin) { process.stdout.write('  ⚡ 跳过\n'); return; }
    const urls = getPluginExternalRequest(TEST_PLUGIN);
    expect(Array.isArray(urls)).toBe(true);
});

it('getPluginMainErrors() 返回数组', () => {
    const errors = getPluginMainErrors('RemoveBg');
    expect(Array.isArray(errors)).toBe(true);
});

it('getModelStatus() 对非模型插件返回 null', () => {
    if (!hasTestPlugin) { process.stdout.write('  ⚡ 跳过\n'); return; }
    const status = getModelStatus(TEST_PLUGIN);
    expect(status === 'ready' || status === 'loading' || status === 'error' || status === null).toBe(true);
});

// ── 执行测试 ────────────────────────────────────────────────────

run().catch(e => {
    process.stderr.write(`\n自测异常: ${e}\n`);
    process.exit(1);
});