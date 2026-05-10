package cmd

import (
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

func init() {
	pluginCmd.AddCommand(pluginListCmd)
}
