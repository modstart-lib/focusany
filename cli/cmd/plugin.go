package cmd

import (
	"archive/zip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"focusany-cli/internal"

	"github.com/spf13/cobra"
)

var pluginCmd = &cobra.Command{
	Use:   "plugin",
	Short: "Manage plugins",
}

var pluginListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all installed plugins",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		result, err := internal.DoRequest(cfg, "GET", "/api/plugin/list", nil)
		if err != nil {
			return err
		}
		return internal.PrintJSON(result)
	},
}

var pluginInstallType string

// --- install ----------------------------------------------------------------

var pluginInstallCmd = &cobra.Command{
	Use:   "install <dir-or-zip>",
	Short: "Install a plugin from a local directory or zip package",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		pathArg := args[0]
		if _, err := os.Stat(pathArg); err != nil {
			return fmt.Errorf("path does not exist: %s", pathArg)
		}
		abs, err := internal.AbsPath(pathArg)
		if err != nil {
			return err
		}
		body := map[string]any{"path": abs}
		if pluginInstallType != "" {
			body["type"] = pluginInstallType
		}
		result, err := internal.DoRequest(cfg, "POST", "/api/plugin/install", body)
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("install failed: %v", result["msg"])
		}
		fmt.Printf("plugin installed: %s\n", abs)
		return nil
	},
}

// --- uninstall --------------------------------------------------------------

var pluginUninstallCmd = &cobra.Command{
	Use:   "uninstall <name>",
	Short: "Uninstall a plugin by name",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		name := args[0]
		result, err := internal.DoRequest(cfg, "POST", "/api/plugin/uninstall", map[string]any{"name": name})
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("uninstall failed: %v", result["msg"])
		}
		fmt.Printf("plugin uninstalled: %s\n", name)
		return nil
	},
}

var pluginRunFiles []string
var pluginPackageOut string
var pluginPackageProd bool

// --- run / start ------------------------------------------------------------

var pluginRunCmd = &cobra.Command{
	Use:   "run <name> [actionName]",
	Short: "Launch a plugin (optionally a specific action)",
	Long: "Launch a plugin's window. Pass --file <path> (repeatable) to hand files " +
		"to the plugin's preload as actionMatchFiles — the same channel as selecting " +
		"files in the search box, letting headless flows drive file-open actions.\n\n" +
		"Example: focusany plugin run BentoSlides --file ~/demo.bento.html",
	Args: cobra.RangeArgs(1, 2),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		name := args[0]
		body := map[string]any{"name": name}
		if len(args) == 2 {
			body["actionName"] = args[1]
		}
		if len(pluginRunFiles) > 0 {
			files := make([]string, 0, len(pluginRunFiles))
			for _, f := range pluginRunFiles {
				abs, err := internal.AbsPath(f)
				if err != nil {
					return err
				}
				files = append(files, abs)
			}
			body["files"] = files
		}
		result, err := internal.DoRequest(cfg, "POST", "/api/plugin/run", body)
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("run failed: %v", result["msg"])
		}
		data, _ := result["data"].(map[string]any)
		action := ""
		if data != nil {
			action, _ = data["action"].(string)
		}
		if action == "" {
			action = "default"
		}
		if len(pluginRunFiles) > 0 {
			fmt.Printf("plugin launched: %s/%s with %d file(s)\n", name, action, len(pluginRunFiles))
		} else {
			fmt.Printf("plugin launched: %s/%s\n", name, action)
		}
		return nil
	},
}

// --- info -------------------------------------------------------------------

var pluginInfoCmd = &cobra.Command{
	Use:   "info <name>",
	Short: "Show details of an installed plugin",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		name := args[0]
		result, err := internal.DoRequest(cfg, "GET", "/api/plugin/info?name="+name, nil)
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("info failed: %v", result["msg"])
		}
		return internal.PrintJSON(result["data"])
	},
}

// --- check (pre-publish validation) -----------------------------------------

var pluginCheckCmd = &cobra.Command{
	Use:   "check <dir>",
	Short: "Validate a plugin directory before publishing",
	Long: "Validate config.json structure and referenced files (main/logo/preload), " +
		"action matches, MCP tool schemas, permissions and development env.",
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		dir, err := internal.AbsPath(args[0])
		if err != nil {
			return err
		}
		res, err := internal.CheckPluginConfig(dir, true)
		if err != nil {
			return err
		}
		for _, w := range res.Warns {
			fmt.Println("WARN  " + w)
		}
		for _, e := range res.Errors {
			fmt.Println("ERROR " + e)
		}
		if !res.Valid {
			return fmt.Errorf("check failed with %d error(s)", len(res.Errors))
		}
		fmt.Println("OK  config.json is valid for release")
		return nil
	},
}

// --- release-prepare --------------------------------------------------------

var pluginReleasePrepareCmd = &cobra.Command{
	Use:   "release-prepare <dir>",
	Short: "Switch development.env to prod for release",
	Long: "Set config.json development.env to \"prod\" (and clear debug flags), the " +
		"same behaviour as `npx focusany release-prepare`. Idempotent.",
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		dir, err := internal.AbsPath(args[0])
		if err != nil {
			return err
		}
		cfgPath := filepath.Join(dir, "config.json")
		raw, err := os.ReadFile(cfgPath)
		if err != nil {
			return err
		}
		var cfg map[string]any
		if err := json.Unmarshal(raw, &cfg); err != nil {
			return fmt.Errorf("config.json is not valid JSON: %w", err)
		}
		dev, _ := cfg["development"].(map[string]any)
		if dev == nil {
			dev = map[string]any{}
			cfg["development"] = dev
		}
		changed := false
		if env, _ := dev["env"].(string); env != "prod" {
			dev["env"] = "prod"
			changed = true
		}
		for _, k := range []string{"showDevTools", "showCodeDevTools", "keepCodeDevTools", "showViewDevTools"} {
			if v, ok := dev[k].(bool); ok && v {
				dev[k] = false
				changed = true
			}
		}
		if !changed {
			fmt.Println("already prod, nothing to change")
			return nil
		}
		out, _ := json.MarshalIndent(cfg, "", "    ")
		if err := os.WriteFile(cfgPath, out, 0644); err != nil {
			return err
		}
		fmt.Println("development.env → prod (" + cfgPath + ")")
		return nil
	},
}

// --- package (zip) ----------------------------------------------------------

var pluginPackageCmd = &cobra.Command{
	Use:   "package <dir>",
	Short: "Package a plugin directory into a release zip",
	Long: "Create a zip archive with config.json at the root (FocusAny installer " +
		"format), excluding entries matched by .faignore. With --prod, applies " +
		"release-prepare first.",
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		dir, err := internal.AbsPath(args[0])
		if err != nil {
			return err
		}
		if pluginPackageProd {
			if err := pluginReleasePrepareCmd.RunE(cmd, []string{dir}); err != nil {
				return err
			}
		}
		if res, err := internal.CheckPluginConfig(dir, true); err != nil {
			return err
		} else if !res.Valid {
			for _, e := range res.Errors {
				fmt.Println("ERROR " + e)
			}
			return fmt.Errorf("check failed, run 'focusany plugin check %s'", dir)
		}
		outPath := pluginPackageOut
		if outPath == "" {
			cfg, err := readPluginConfigName(dir)
			if err != nil {
				return err
			}
			parent := filepath.Dir(dir)
			outPath = filepath.Join(parent, cfg+".zip")
		}
		if !strings.HasSuffix(strings.ToLower(outPath), ".zip") {
			outPath += ".zip"
		}
		if err := internal.ZipPlugin(dir, outPath); err != nil {
			return err
		}
		fi, _ := os.Stat(outPath)
		fmt.Printf("packaged: %s (%d bytes)\n", outPath, fi.Size())
		return nil
	},
}

var pluginScreenshotOut string
var pluginScreenshotRaw bool

// --- screenshot (capture plugin window as base64 PNG) -----------------------

var pluginScreenshotCmd = &cobra.Command{
	Use:   "screenshot <name>",
	Short: "Capture a running plugin's window as a base64 PNG",
	Long: "Capture the currently open window of a plugin and print the image " +
		"as base64 (PNG). The plugin must be running (e.g. via `focusany plugin " +
		"run <name>`).\n\n" +
		"By default prints a one-line summary plus the base64 data. With --raw, " +
		"prints only the base64 (suitable for piping into scripts). With --output, " +
		"decodes and writes the PNG to a file instead.\n\n" +
		"Examples:\n" +
		"  focusany plugin screenshot BentoSlides\n" +
		"  focusany plugin screenshot BentoSlides --raw | base64 -d > shot.png\n" +
		"  focusany plugin screenshot BentoSlides --output shot.png",
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		name := args[0]
		result, err := internal.DoRequest(cfg, "POST", "/api/plugin/capture", map[string]any{"name": name})
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("capture failed: %v", result["msg"])
		}
		data, _ := result["data"].(map[string]any)
		b64, _ := data["base64"].(string)
		if b64 == "" {
			return fmt.Errorf("capture returned no image data")
		}
		if pluginScreenshotOut != "" {
			decoded, err := decodeBase64(b64)
			if err != nil {
				return err
			}
			outPath, err := internal.AbsPath(pluginScreenshotOut)
			if err != nil {
				return err
			}
			if err := os.WriteFile(outPath, decoded, 0644); err != nil {
				return err
			}
			fmt.Printf("screenshot saved: %s (%d bytes)\n", outPath, len(decoded))
			return nil
		}
		if pluginScreenshotRaw {
			fmt.Println(b64)
			return nil
		}
		fmt.Printf("screenshot captured: %s (base64 PNG, %d chars)\n", name, len(b64))
		fmt.Println(b64)
		return nil
	},
}

func decodeBase64(s string) ([]byte, error) {
	// tolerate optional data:image/png;base64, prefix
	if i := strings.Index(s, ","); i >= 0 && strings.HasPrefix(s[:i], "data:image") {
		s = s[i+1:]
	}
	decoded, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, fmt.Errorf("decode base64: %w", err)
	}
	return decoded, nil
}

var pluginPublishVersion string
var pluginPublishInfo bool

// --- publish (package + upload to official store via desktop UserApi) -------

var pluginPublishCmd = &cobra.Command{
	Use:   "publish <name>",
	Short: "Package the plugin and upload it to the official store",
	Long: "Ask the running FocusAny desktop app to publish the plugin: it " +
		"packages the installed plugin directory (excludes node_modules/.git/." +
		"faignore, rewrites config.json without development/$schema), parses " +
		"release.md for the version entry, and uploads via the app's UserApi " +
		"(store/plugin_publish) using the logged-in user token.\n\n" +
		"The plugin must be installed as a directory (dir type), its config.json " +
		"version must match --version (defaults to the installed version), and " +
		"development.env must be prod.\n\n" +
		"Examples:\n" +
		"  focusany plugin publish Bento\n" +
		"  focusany plugin publish Bento --version 1.0.0\n" +
		"  focusany plugin publish Bento --info-only   # update content/preview only",
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		name := args[0]
		path := "/api/plugin/publish"
		verb := "publishing"
		if pluginPublishInfo {
			path = "/api/plugin/publish-info"
			verb = "updating info"
		}
		body := map[string]any{"name": name}
		if pluginPublishVersion != "" {
			body["version"] = pluginPublishVersion
		}
		fmt.Printf("%s %s ...\n", verb, name)
		result, err := internal.DoRequest(cfg, "POST", path, body)
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("publish failed: %v", result["msg"])
		}
		return internal.PrintJSON(result["data"])
	},
}

var pluginEvalFile string

// --- eval (execute JS in the plugin's window) ------------------------------

var pluginEvalCmd = &cobra.Command{
	Use:   "eval <name> <script>",
	Short: "Execute JS in a running plugin's window and print the result",
	Long: "Execute a JavaScript expression inside the plugin's currently open " +
		"window (detach → main view) and print the JSON-safe result. The script " +
		"runs inside an async wrapper, so `await` is allowed and thrown errors " +
		"are reported as PluginEvalScriptError.\n\n" +
		"Script can be given inline or via --file. Results that are strings are " +
		"printed raw; other values are printed as JSON.\n\n" +
		"Examples:\n" +
		"  focusany plugin eval Nat \"document.querySelectorAll('.card').length\"\n" +
		"  focusany plugin eval Nat --file tests/ui-state.js",
	Args: cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		name := args[0]
		script := args[1]
		if pluginEvalFile != "" {
			raw, err := os.ReadFile(pluginEvalFile)
			if err != nil {
				return err
			}
			script = string(raw)
		}
		if strings.TrimSpace(script) == "" {
			return fmt.Errorf("empty script")
		}
		result, err := internal.DoRequest(cfg, "POST", "/api/plugin/eval", map[string]any{"name": name, "script": script})
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("eval failed: %v", result["msg"])
		}
		data, _ := result["data"].(map[string]any)
		val := data["result"]
		if s, ok := val.(string); ok {
			fmt.Println(s)
			return nil
		}
		return internal.PrintJSON(val)
	},
}

// --- windows (list open plugin windows) ------------------------------------

var pluginWindowsCmd = &cobra.Command{
	Use:   "windows [name]",
	Short: "List open windows/views of plugins (optionally filter by name)",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		body := map[string]any{}
		if len(args) == 1 {
			body["name"] = args[0]
		} else if len(args) > 1 {
			return fmt.Errorf("accepts at most 1 arg (plugin name)")
		}
		result, err := internal.DoRequest(cfg, "POST", "/api/plugin/window-list", body)
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("window-list failed: %v", result["msg"])
		}
		return internal.PrintJSON(result["data"])
	},
}

// --- close (close a plugin's window(s)) ------------------------------------

var pluginCloseCmd = &cobra.Command{
	Use:   "close <name>",
	Short: "Close all open windows/views of a plugin",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		name := args[0]
		result, err := internal.DoRequest(cfg, "POST", "/api/plugin/close", map[string]any{"name": name})
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("close failed: %v", result["msg"])
		}
		data, _ := result["data"].(map[string]any)
		closed, _ := data["closed"].([]any)
		fmt.Printf("closed %s windows: %s\n", name, strings.Join(toStrings(closed), ", "))
		return nil
	},
}

// --- event (call a backend.cjs event handler directly) ---------------------

var pluginEventCmd = &cobra.Command{
	Use:   "event <name> <event> [jsonData]",
	Short: "Call a plugin's backend.cjs event handler (headless)",
	Long: "Invoke a backend.cjs event handler directly with the given JSON data, " +
		"the same channel the frontend sendBackendEvent() uses but without " +
		"needing a plugin window. Great for backend logic testing.\n\n" +
		"Example: focusany plugin event Nat nat.list",
	Args: cobra.RangeArgs(2, 3),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		name := args[0]
		event := args[1]
		var data any
		if len(args) == 3 {
			if err := json.Unmarshal([]byte(args[2]), &data); err != nil {
				return fmt.Errorf("jsonData is not valid JSON: %w", err)
			}
		}
		result, err := internal.DoRequest(cfg, "POST", "/api/plugin/event", map[string]any{
			"name": name, "event": event, "data": data,
		})
		if err != nil {
			return err
		}
		if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("event %s.%s failed: %v", name, event, result["msg"])
		}
		return internal.PrintJSON(result["data"])
	},
}

func toStrings(items []any) []string {
	out := make([]string, 0, len(items))
	for _, it := range items {
		out = append(out, fmt.Sprintf("%v", it))
	}
	return out
}

func readPluginConfigName(dir string) (string, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "config.json"))
	if err != nil {
		return "", err
	}
	var cfg map[string]any
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return "", err
	}
	name, _ := cfg["name"].(string)
	if name == "" {
		return "", fmt.Errorf("config.json has no name")
	}
	return name, nil
}

// readPluginNameFromZip extracts the plugin name from a zip's config.json.
func readPluginNameFromZip(zipPath string) (string, error) {
	zr, err := zip.OpenReader(zipPath)
	if err != nil {
		return "", err
	}
	defer zr.Close()
	for _, f := range zr.File {
		if f.Name != "config.json" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return "", err
		}
		var cfg map[string]any
		if err := json.NewDecoder(rc).Decode(&cfg); err != nil {
			rc.Close()
			return "", err
		}
		rc.Close()
		name, _ := cfg["name"].(string)
		if name == "" {
			return "", fmt.Errorf("zip config.json has no name")
		}
		return name, nil
	}
	return "", fmt.Errorf("zip has no config.json at root")
}

// --- smoke (one-shot install → launch → verify → cleanup) -------------------

var (
	pluginSmokeKeep bool
	pluginSmokeCall string
	pluginSmokeArgs string
	pluginSmokeType string
)

var pluginSmokeCmd = &cobra.Command{
	Use:   "smoke <dir-or-name>",
	Short: "Smoke-test a plugin: install if needed, launch, verify MCP tools, cleanup",
	Long: "Install the plugin directory (if not installed), launch it, list its MCP tools, " +
		"optionally call one tool, then uninstall unless --keep is given.\n\n" +
		"Examples:\n" +
		"  focusany plugin smoke ./my-plugin\n" +
		"  focusany plugin smoke ./my-plugin --call my.tool '{\"a\":1}'\n" +
		"  focusany plugin smoke BentoSlides --keep",
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		target := args[0]
		wasInstalled := true

		// resolve the plugin name: installed name, or read from dir/zip config.json
		name := target
		if !isInstalled(cfg, target) {
			abs, err := internal.AbsPath(target)
			if err != nil {
				return err
			}
			// zip packages don't expose config.json on disk — read it out of the zip
			body := map[string]any{"path": abs}
			if pluginSmokeType == "zip" || (strings.HasSuffix(strings.ToLower(abs), ".zip")) {
				body["type"] = "zip"
				n, err := readPluginNameFromZip(abs)
				if err != nil {
					return fmt.Errorf("cannot read plugin name from %s: %w", abs, err)
				}
				name = n
			} else {
				if st, err := os.Stat(abs); err != nil || !st.IsDir() {
					return fmt.Errorf("plugin not installed and %s is not a directory or zip", target)
				}
				n, err := readPluginConfigName(abs)
				if err != nil {
					return err
				}
				name = n
			}
			fmt.Printf("installing %s ...\n", abs)
			if result, err := internal.DoRequest(cfg, "POST", "/api/plugin/install", body); err != nil {
				return err
			} else if code, _ := result["code"].(float64); code != 0 {
				return fmt.Errorf("install failed: %v", result["msg"])
			}
			wasInstalled = false
		} else {
			fmt.Printf("plugin already installed: %s\n", name)
		}

		// cleanup (unless --keep or it was already installed before us)
		cleanup := !pluginSmokeKeep && !wasInstalled
		defer func() {
			if cleanup {
				if _, err := internal.DoRequest(cfg, "POST", "/api/plugin/uninstall", map[string]any{"name": name}); err == nil {
					fmt.Printf("cleaned up: uninstalled %s\n", name)
				}
			}
		}()

		// launch
		fmt.Printf("launching %s ...\n", name)
		if result, err := internal.DoRequest(cfg, "POST", "/api/plugin/run", map[string]any{"name": name}); err != nil {
			return err
		} else if code, _ := result["code"].(float64); code != 0 {
			return fmt.Errorf("run failed: %v", result["msg"])
		}
		fmt.Println("launched (window should be visible)")

		// list MCP tools
		tools, err := listMcpTools()
		if err != nil {
			return fmt.Errorf("mcp tools unreachable: %w", err)
		}
		var mine []string
		for _, t := range tools {
			if strings.HasPrefix(t, name+"-") {
				mine = append(mine, strings.TrimPrefix(t, name+"-"))
			}
		}
		if len(mine) == 0 {
			fmt.Println("mcp: plugin exposes no MCP tools")
		} else {
			fmt.Printf("mcp tools: %s\n", strings.Join(mine, ", "))
		}

		// optional tool call
		if pluginSmokeCall != "" {
			fmt.Printf("calling %s.%s ...\n", name, pluginSmokeCall)
			if err := mcpCallTool(name, pluginSmokeCall, pluginSmokeArgs); err != nil {
				return err
			}
		}

		fmt.Println("smoke OK")
		return nil
	},
}

func isInstalled(cfg *internal.AuthConfig, name string) bool {
	result, err := internal.DoRequest(cfg, "GET", "/api/plugin/list", nil)
	if err != nil {
		return false
	}
	data, _ := result["data"].(map[string]any)
	list, _ := data["list"].([]any)
	for _, p := range list {
		if pm, ok := p.(map[string]any); ok {
			if fmt.Sprintf("%v", pm["name"]) == name {
				return true
			}
		}
	}
	return false
}

func listMcpTools() ([]string, error) {
	result, err := mcpRPC("tools/list", map[string]any{}, 1)
	if err != nil {
		return nil, err
	}
	res, _ := result["result"].(map[string]any)
	tools, _ := res["tools"].([]any)
	var names []string
	for _, t := range tools {
		if tm, ok := t.(map[string]any); ok {
			names = append(names, fmt.Sprintf("%v", tm["name"]))
		}
	}
	return names, nil
}

func mcpCallTool(pluginName, toolName, argsJSON string) error {
	params := map[string]any{}
	if argsJSON != "" {
		if err := json.Unmarshal([]byte(argsJSON), &params); err != nil {
			return fmt.Errorf("args not valid JSON: %w", err)
		}
	}
	result, err := mcpRPC("tools/call", map[string]any{"name": pluginName + "-" + toolName, "arguments": params}, 1)
	if err != nil {
		return err
	}
	if errMsg, ok := result["error"].(map[string]any); ok {
		return fmt.Errorf("mcp tool error: %v", errMsg["message"])
	}
	out, _ := json.MarshalIndent(result["result"], "  ", "  ")
	fmt.Println(string(out))
	return nil
}

func init() {
	pluginInstallCmd.Flags().StringVar(&pluginInstallType, "type", "", "package type: dir (default) or zip")
	pluginRunCmd.Flags().StringArrayVar(&pluginRunFiles, "file", nil, "file(s) to hand to the plugin (repeatable, like selecting files in search)")
	pluginPackageCmd.Flags().StringVarP(&pluginPackageOut, "output", "o", "", "output zip path (default: <name>.zip next to the plugin dir)")
	pluginPackageCmd.Flags().BoolVar(&pluginPackageProd, "prod", false, "apply release-prepare (dev→prod) before packaging")
	pluginPublishCmd.Flags().StringVar(&pluginPublishVersion, "version", "", "version to publish (default: installed plugin version)")
	pluginPublishCmd.Flags().BoolVar(&pluginPublishInfo, "info-only", false, "only update store content/preview info, no package upload")
	pluginScreenshotCmd.Flags().StringVarP(&pluginScreenshotOut, "output", "o", "", "write decoded PNG to a file instead of printing base64")
	pluginScreenshotCmd.Flags().BoolVar(&pluginScreenshotRaw, "raw", false, "print only the base64 payload (no summary line)")
	pluginSmokeCmd.Flags().BoolVar(&pluginSmokeKeep, "keep", false, "keep the plugin installed after the smoke test (default: uninstall)")
	pluginSmokeCmd.Flags().StringVar(&pluginSmokeCall, "call", "", "MCP tool name to call as part of the smoke test (e.g. bento.new_deck)")
	pluginSmokeCmd.Flags().StringVar(&pluginSmokeArgs, "args", "", "JSON args for --call")
	pluginSmokeCmd.Flags().StringVar(&pluginSmokeType, "type", "", "package type when installing: dir (default) or zip")
	pluginEvalCmd.Flags().StringVar(&pluginEvalFile, "file", "", "read the script from a file instead of the inline arg")
	pluginCmd.AddCommand(pluginListCmd)
	pluginCmd.AddCommand(pluginInstallCmd)
	pluginCmd.AddCommand(pluginUninstallCmd)
	pluginCmd.AddCommand(pluginRunCmd)
	pluginCmd.AddCommand(pluginInfoCmd)
	pluginCmd.AddCommand(pluginCheckCmd)
	pluginCmd.AddCommand(pluginReleasePrepareCmd)
	pluginCmd.AddCommand(pluginPackageCmd)
	pluginCmd.AddCommand(pluginPublishCmd)
	pluginCmd.AddCommand(pluginScreenshotCmd)
	pluginCmd.AddCommand(pluginSmokeCmd)
	pluginCmd.AddCommand(pluginEvalCmd)
	pluginCmd.AddCommand(pluginWindowsCmd)
	pluginCmd.AddCommand(pluginCloseCmd)
	pluginCmd.AddCommand(pluginEventCmd)
}
