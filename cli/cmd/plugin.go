package cmd

import (
	"fmt"
	"os"

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

func init() {
	pluginInstallCmd.Flags().StringVar(&pluginInstallType, "type", "", "package type: dir (default) or zip")
	pluginRunCmd.Flags().StringArrayVar(&pluginRunFiles, "file", nil, "file(s) to hand to the plugin (repeatable, like selecting files in search)")
	pluginCmd.AddCommand(pluginListCmd)
	pluginCmd.AddCommand(pluginInstallCmd)
	pluginCmd.AddCommand(pluginUninstallCmd)
	pluginCmd.AddCommand(pluginRunCmd)
	pluginCmd.AddCommand(pluginInfoCmd)
}
