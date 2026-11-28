package cmd

import (
	_ "embed"
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

// The guide body lives in a Markdown file so it keeps its formatting (fenced
// code blocks) and stays easy to read and edit outside Go source.
//
//go:embed skill/usage.zh.md
var skillUsageZh string

var skillCmd = &cobra.Command{
	Use:     "skill",
	Aliases: []string{"usage", "guide"},
	Short:   "Print the FocusAny usage guide (install, basics, plugins, CLI)",
	Long: "Print a ready-to-read Markdown guide (currently in Chinese) on how to use " +
		"FocusAny: install and start, everyday operations, plugin installation, the " +
		"optional CLI, FAQ and links. It needs no running FocusAny and no network " +
		"access, so it can be shown to users or handed to an AI agent as-is.",
	Args: cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		text := skillUsageZh
		if !strings.HasSuffix(text, "\n") {
			text += "\n"
		}
		fmt.Print(text)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(skillCmd)
}
