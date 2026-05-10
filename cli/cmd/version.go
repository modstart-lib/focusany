package cmd

import (
	"focusany-cli/internal"

	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	RunE: func(cmd *cobra.Command, args []string) error {
		return internal.PrintJSON(map[string]string{
			"version": appVersion,
		})
	},
}
