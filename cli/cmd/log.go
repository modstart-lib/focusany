package cmd

import (
	"fmt"
	"strings"
	"time"

	"focusany-cli/internal"

	"github.com/spf13/cobra"
)

var (
	logLines    int
	logFollow   bool
	logPlugin   string
	logDate     string
	logLevel    string
	logList     bool
)

var logCmd = &cobra.Command{
	Use:   "log",
	Short: "View FocusAny and plugin logs",
	Long: "View the FocusAny log (log_YYYYMMDD.log) or a plugin's log " +
		"(Plugin_<Name>_YYYYMMDD.log) under the configured data path.",
	RunE: func(cmd *cobra.Command, args []string) error {
		logDir, err := internal.LogDir()
		if err != nil {
			return err
		}

		if logList {
			names, err := internal.ListPluginLogs(logDir)
			if err != nil {
				return err
			}
			if len(names) == 0 {
				fmt.Println("(no plugin logs found)")
				return nil
			}
			for _, n := range names {
				fmt.Println(n)
			}
			return nil
		}

		path, err := internal.LogFileName(logDir, logPlugin, normalizeDate(logDate))
		if err != nil {
			return err
		}
		lines, err := internal.TailLines(path, logLines)
		if err != nil {
			return err
		}
		lines = internal.FilterLevel(lines, logLevel)

		if !logFollow {
			if len(lines) == 0 {
				fmt.Println("(no matching lines)")
				return nil
			}
			for _, l := range lines {
				fmt.Println(l)
			}
			return nil
		}

		// follow: print current tail, then poll for appended lines
		fmt.Println("following " + path + " (Ctrl+C to stop)")
		offset := len(lines)
		for _, l := range lines {
			fmt.Println(l)
		}
		for {
			time.Sleep(1 * time.Second)
			all, err := internal.TailLines(path, 1<<30)
			if err != nil {
				continue
			}
			if len(all) > offset {
				for _, l := range internal.FilterLevel(all[offset:], logLevel) {
					fmt.Println(l)
				}
				offset = len(all)
			}
		}
	},
}

func init() {
	logCmd.Flags().IntVarP(&logLines, "lines", "n", 50, "number of trailing lines to show")
	logCmd.Flags().BoolVarP(&logFollow, "follow", "f", false, "keep tailing appended lines")
	logCmd.Flags().StringVar(&logPlugin, "plugin", "", "plugin name (shows Plugin_<Name>_<date>.log)")
	logCmd.Flags().StringVar(&logDate, "date", "", "log date YYYYMMDD or YYYY-MM-DD (default: today)")
	logCmd.Flags().StringVar(&logLevel, "level", "", "filter by level (INFO/WARN/ERROR)")
	logCmd.Flags().BoolVar(&logList, "list", false, "list available plugin log files")
}

// normalizeDate converts an optional user date to YYYYMMDD.
func normalizeDate(d string) string {
	if d == "" {
		return ""
	}
	return strings.ReplaceAll(d, "-", "")
}
