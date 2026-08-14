# FocusAny SDK

TypeScript definitions and utilities for FocusAny.

## Installation

```bash
npm install focusany-sdk
```

## CLI Tools

### FocusAny CLI

The SDK now provides a unified command-line interface through the `focusany` command.

```bash
npx focusany <command> [options]
```

Available commands:

- `release-prepare`: Check and update config.json for production release
- `cli`: Forward commands to the locally installed FocusAny CLI
- `status`: Check the local FocusAny environment (app, CLI binary, service)
- `version`: Display the current version of FocusAny SDK
- `help`: Show help information

### FocusAny CLI Bridge

The `cli` command finds the real FocusAny CLI installed on your machine and
forwards all arguments to it — useful while developing plugins, without
installing the CLI separately.

```bash
npx focusany cli plugin list
npx focusany cli doctor
npx focusany cli mcp tools
```

The CLI binary is located in this priority order:

1. `--cli <path>` explicit override
2. `FOCUSANY_CLI` environment variable
3. `focusany` on `PATH`
4. Common install locations (`~/.focusany/bin`, `~/.local/bin`,
   `/usr/local/bin`, `/opt/homebrew/bin`, `dist-cli/` of the current project)

### Status

The `status` command diagnoses the local FocusAny setup:

```bash
npx focusany status
```

It reports whether the FocusAny desktop app is installed, where the CLI binary
was found, the data root directory, and whether the FocusAny service is
running. Exits non-zero when any check fails.

### Release Prepare

#### Basic Usage

```bash
npx focusany release-prepare
```

This will check `dist/config.json` in your current directory.

#### Custom Config Path

```bash
npx focusany release-prepare path/to/your/config.json
```

This command will:

- Look for the specified config file (or `dist/config.json` by default)
- Check if `development.env` is set to `"dev"`
- Automatically change it to `"prod"` if needed
- Display appropriate messages about the changes made

#### Usage Examples

**Release Prepare - Default config file:**

```bash
npx focusany release-prepare
```

**Release Prepare - Custom config file:**

```bash
npx focusany release-prepare build/config.json
npx focusany release-prepare src/configs/app-config.json
```

**Version Command:**

```bash
npx focusany version
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
