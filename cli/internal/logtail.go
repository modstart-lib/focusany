package internal

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// --- log tailing ------------------------------------------------------------

// LogDir returns the FocusAny logs directory under the configured data path.
func LogDir() (string, error) {
	cfg, err := LoadClientConfig()
	if err != nil {
		return "", err
	}
	return filepath.Join(cfg.DataRoot, "logs"), nil
}

// LogFileName picks today's (or a requested date's) log file for a scope:
//   - plugin == ""      → log_YYYYMMDD.log        (the global FocusAny log)
//   - plugin != ""      → Plugin_<Name>_YYYYMMDD.log
func LogFileName(logDir, plugin, date string) (string, error) {
	if date == "" {
		date = time.Now().Format("20060102")
	}
	var name string
	if plugin != "" {
		name = fmt.Sprintf("Plugin_%s_%s.log", plugin, date)
	} else {
		name = fmt.Sprintf("log_%s.log", date)
	}
	p := filepath.Join(logDir, name)
	if _, err := os.Stat(p); err != nil {
		return "", fmt.Errorf("log file not found: %s (dataRoot=%s)", p, logDir)
	}
	return p, nil
}

// ListPluginLogs returns plugin log files present in the log dir (sorted desc).
func ListPluginLogs(logDir string) ([]string, error) {
	entries, err := os.ReadDir(logDir)
	if err != nil {
		return nil, err
	}
	var out []string
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "Plugin_") && strings.HasSuffix(e.Name(), ".log") {
			out = append(out, e.Name())
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(out)))
	return out, nil
}

// TailLines returns the last n non-empty lines of a file.
func TailLines(path string, n int) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 1024*1024), 1024*1024)
	var ring []string
	for sc.Scan() {
		line := sc.Text()
		if strings.TrimSpace(line) == "" {
			continue
		}
		if len(ring) < n {
			ring = append(ring, line)
		} else {
			ring = append(ring[1:], line)
		}
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	return ring, nil
}

// FilterLevel keeps lines whose level token (INFO/WARN/ERROR/…) matches.
func FilterLevel(lines []string, level string) []string {
	if level == "" {
		return lines
	}
	want := strings.ToUpper(level)
	var out []string
	for _, l := range lines {
		// line format: "2026-08-09 00:00:00 - LEVEL - label - data"
		parts := strings.SplitN(l, " - ", 3)
		if len(parts) >= 2 && strings.EqualFold(strings.TrimSpace(parts[1]), want) {
			out = append(out, l)
		}
	}
	return out
}
