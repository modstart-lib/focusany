#!/usr/bin/env node

/**
 * 测试 release-prepare 命令
 * 这个脚本会复制测试配置文件并运行 release-prepare 命令，然后验证结果
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 测试配置文件路径
const TEST_CONFIG_PATH = path.resolve(__dirname, 'config.json');
const TEMP_CONFIG_PATH = path.resolve(__dirname, 'temp-config.json');

// 复制测试配置文件
function copyTestConfig() {
  console.log('📋 复制测试配置文件...');
  const configContent = fs.readFileSync(TEST_CONFIG_PATH, 'utf-8');
  fs.writeFileSync(TEMP_CONFIG_PATH, configContent, 'utf-8');
  console.log('✅ 配置文件已复制');
}

// 运行 release-prepare 命令
function runReleasePrepare() {
  console.log('🚀 运行 release-prepare 命令...');
  try {
    const output = execSync(`node ${path.resolve(__dirname, '../bin/command.js')} release-prepare ${TEMP_CONFIG_PATH}`, { encoding: 'utf-8' });
    console.log(output);
    return true;
  } catch (error) {
    console.error('❌ 命令执行失败:', error.message);
    return false;
  }
}

// 验证配置文件是否已正确更新
function verifyConfigUpdate() {
  console.log('🔍 验证配置文件更新...');
  try {
    const updatedConfig = JSON.parse(fs.readFileSync(TEMP_CONFIG_PATH, 'utf-8'));
    
    if (updatedConfig.development && updatedConfig.development.env === 'prod') {
      console.log('✅ 验证通过: env 字段已从 "dev" 更新为 "prod"');
      return true;
    } else {
      console.error('❌ 验证失败: env 字段未正确更新');
      console.log('当前配置:', JSON.stringify(updatedConfig, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ 读取更新后的配置文件失败:', error.message);
    return false;
  }
}

// 清理临时文件
function cleanup() {
  console.log('🧹 清理临时文件...');
  if (fs.existsSync(TEMP_CONFIG_PATH)) {
    fs.unlinkSync(TEMP_CONFIG_PATH);
    console.log('✅ 临时文件已删除');
  }
}

// 运行测试
function runTest() {
  console.log('🧪 开始测试 release-prepare 命令...');
  
  try {
    copyTestConfig();
    const commandSuccess = runReleasePrepare();
    
    if (!commandSuccess) {
      console.error('❌ 测试失败: 命令执行出错');
      cleanup();
      process.exit(1);
    }
    
    const verifySuccess = verifyConfigUpdate();
    
    if (!verifySuccess) {
      console.error('❌ 测试失败: 配置验证未通过');
      cleanup();
      process.exit(1);
    }
    
    console.log('🎉 测试成功: release-prepare 命令正常工作!');
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    cleanup();
  }
}

// 执行测试
runTest();