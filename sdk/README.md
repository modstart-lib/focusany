# FocusAny SDK

TypeScript definitions and utilities for FocusAny.

## Installation

```bash
npm install focusany-sdk
```

## CLI Tools

### Release Check

The `focusany-sdk-release-check` command helps ensure your project is ready for production by checking and updating the configuration file.

#### Basic Usage

```bash
npx focusany-sdk-release-check
```

This will check `dist/config.json` in your current directory.

#### Custom Config Path

```bash
npx focusany-sdk-release-check path/to/your/config.json
```

This command will:
- Look for the specified config file (or `dist/config.json` by default)
- Check if `development.env` is set to `"dev"`
- Automatically change it to `"prod"` if needed
- Display appropriate messages about the changes made

#### Usage Examples

**Default config file:**
```bash
npx focusany-sdk-release-check
```

**Custom config file:**
```bash
npx focusany-sdk-release-check build/config.json
npx focusany-sdk-release-check src/configs/app-config.json
```

Output example:
```
🔍 FocusAny SDK Release Check
使用自定义配置文件路径: build/config.json
检查配置文件: /path/to/your/project/build/config.json
⚠️ 检测到 config.json 中的 env 字段为 "dev"，已将其修改为 "prod"
✅ 配置文件已更新
🎉 Release check 完成
```

## Development

### Building

```bash
npm run build
```

This will build both the shim files and the CLI tools.

### Building CLI only

```bash
npm run build:cli
```

### Building shim only

```bash
npm run build:shim
```

## License

Apache-2.0
