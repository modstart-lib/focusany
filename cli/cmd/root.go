package cmd

import (
	"os"

	"github.com/spf13/cobra"
)

var appVersion string

// Execute sets the version and runs the root command.
func Execute(version string) {
	appVersion = version
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "focusany",
	Short: "FocusAny CLI",
	Long:  "FocusAny command-line tool for interacting with the local FocusAny service.",
}

func init() {
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(pluginCmd)
}
