package cmd

import (
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

func init() {
	pluginInstallCmd.Flags().StringVar(&pluginInstallType, "type", "", "package type: dir (default) or zip")
	pluginRunCmd.Flags().StringArrayVar(&pluginRunFiles, "file", nil, "file(s) to hand to the plugin (repeatable, like selecting files in search)")
	pluginPackageCmd.Flags().StringVarP(&pluginPackageOut, "output", "o", "", "output zip path (default: <name>.zip next to the plugin dir)")
	pluginPackageCmd.Flags().BoolVar(&pluginPackageProd, "prod", false, "apply release-prepare (dev→prod) before packaging")
	pluginCmd.AddCommand(pluginListCmd)
	pluginCmd.AddCommand(pluginInstallCmd)
	pluginCmd.AddCommand(pluginUninstallCmd)
	pluginCmd.AddCommand(pluginRunCmd)
	pluginCmd.AddCommand(pluginInfoCmd)
	pluginCmd.AddCommand(pluginCheckCmd)
	pluginCmd.AddCommand(pluginReleasePrepareCmd)
	pluginCmd.AddCommand(pluginPackageCmd)
}
