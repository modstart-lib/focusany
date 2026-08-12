package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"focusany-cli/internal"

	"github.com/spf13/cobra"
)

var infoCmd = &cobra.Command{
	Use:   "info",
	Short: "Show FocusAny data directory and runtime info",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadClientConfig()
		if err != nil {
			return err
		}
		out := map[string]any{
			"dataRoot": cfg.DataRoot,
			"logsDir":  filepath.Join(cfg.DataRoot, "logs"),
			"kvdbDir":  filepath.Join(cfg.DataRoot, "kvdb"),
		}

		// plugin directory (installed plugins land under dataRoot/plugin)
		pd := filepath.Join(cfg.DataRoot, "plugin")
		if st, err := os.Stat(pd); err == nil && st.IsDir() {
			entries, _ := os.ReadDir(pd)
			var names []string
			for _, e := range entries {
				if e.IsDir() {
					names = append(names, e.Name())
				}
			}
			out["pluginDir"] = pd
			out["plugins"] = names
		}

		// cli auth (port + masked token)
		if auth, err := internal.LoadAuthConfig(); err == nil {
			token := auth.Token
			if len(token) > 8 {
				token = token[:4] + "…" + token[len(token)-4:]
			}
			out["cliApi"] = map[string]any{
				"endpoint": fmt.Sprintf("http://127.0.0.1:%d", auth.Port),
				"token":    token,
			}
		}

		// env override
		if envRoot := os.Getenv("FOCUSANY_DATA_ROOT"); envRoot != "" {
			out["envOverride"] = envRoot
		}

		// plugin log files (latest 5)
		logDir := filepath.Join(cfg.DataRoot, "logs")
		if entries, err := os.ReadDir(logDir); err == nil {
			var logs []string
			for _, e := range entries {
				if strings.HasPrefix(e.Name(), "Plugin_") && strings.HasSuffix(e.Name(), ".log") {
					logs = append(logs, e.Name())
				}
			}
			if len(logs) > 5 {
				logs = logs[len(logs)-5:]
			}
			out["pluginLogs"] = logs
		}

		return internal.PrintJSON(out)
	},
}

func init() {
	rootCmd.AddCommand(infoCmd)
}
