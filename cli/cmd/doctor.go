package cmd

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"focusany-cli/internal"

	"github.com/spf13/cobra"
)

// doctor — environment self-check for the "is everything ready?" question:
// FocusAny running, CLI auth ok, MCP server up, LLM models enabled, key
// plugins installed, no error spam in plugin logs.

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Check the FocusAny environment (running, auth, MCP, models, plugins)",
	RunE: func(cmd *cobra.Command, args []string) error {
		problems := 0
		pass := func(name, detail string) {
			fmt.Printf("  ok    %-28s %s\n", name, detail)
		}
		fail := func(name, detail string) {
			fmt.Printf("  FAIL  %-28s %s\n", name, detail)
			problems++
		}
		warn := func(name, detail string) {
			fmt.Printf("  warn  %-28s %s\n", name, detail)
		}

		// 1. data dir + client config
		cfg, err := internal.LoadClientConfig()
		if err != nil {
			fail("data config", err.Error())
		} else {
			pass("data dir", cfg.DataRoot)
		}
		if envRoot := os.Getenv("FOCUSANY_DATA_ROOT"); envRoot != "" {
			warn("env override", "FOCUSANY_DATA_ROOT="+envRoot)
		}

		// 2. cli auth + API reachability (with token — a bare GET would 401 by design)
		auth, err := internal.LoadAuthConfig()
		if err != nil {
			fail("cli auth", err.Error())
			problems++ // no point continuing against a dead API
		} else {
			pass("cli api", fmt.Sprintf("127.0.0.1:%d", auth.Port))
			if _, err := internal.DoRequest(auth, "GET", "/api/plugin/list", nil); err != nil {
				fail("api auth", err.Error())
			} else {
				pass("api auth", "token ok")
			}
		}

		// 3. MCP server
		mcpClient := &http.Client{Timeout: 3 * time.Second}
		if resp, err := mcpClient.Get(mcpEndpoint); err != nil {
			fail("mcp server", "61000 unreachable: "+err.Error())
		} else {
			resp.Body.Close()
			pass("mcp server", "127.0.0.1:61000/mcp")
		}

		// 4. LLM models
		if auth != nil {
			result, err := internal.DoRequest(auth, "GET", "/api/llm/models", nil)
			if err != nil {
				fail("llm models", err.Error())
			} else if code, _ := result["code"].(float64); code != 0 {
				fail("llm models", fmt.Sprintf("%v", result["msg"]))
			} else {
				list := []any{}
				if data, ok := result["data"].(map[string]any); ok {
					if l, ok := data["list"].([]any); ok {
						list = l
					}
				}
				if len(list) == 0 {
					fail("llm models", "no enabled model — configure one in FocusAny settings (AI 功能需要)")
				} else {
					var names []string
					for _, m := range list {
						if mm, ok := m.(map[string]any); ok {
							names = append(names, fmt.Sprintf("%s/%s", mm["providerId"], mm["modelId"]))
						}
					}
					pass("llm models", strings.Join(names, ", "))
				}
			}
		}

		// 5. plugins
		if auth != nil {
			if result, err := internal.DoRequest(auth, "GET", "/api/plugin/list", nil); err == nil {
				if data, ok := result["data"].(map[string]any); ok {
					if list, ok := data["list"].([]any); ok {
						var names []string
						for _, p := range list {
							if pm, ok := p.(map[string]any); ok {
								names = append(names, fmt.Sprintf("%v", pm["name"]))
							}
						}
						pass("plugins", fmt.Sprintf("%d installed: %s", len(names), strings.Join(names, ", ")))
						for _, want := range []string{"BentoSlides"} {
							found := false
							for _, n := range names {
								if n == want {
									found = true
									break
								}
							}
							if !found {
								warn("plugin "+want, "not installed")
							}
						}
					}
				}
			}
		}

		// 6. plugin logs — any ERROR recently?
		if logDir, err := internal.LogDir(); err == nil {
			entries, _ := os.ReadDir(logDir)
			var recentErr []string
			for _, e := range entries {
				if !strings.HasPrefix(e.Name(), "Plugin_") || !strings.HasSuffix(e.Name(), ".log") {
					continue
				}
				info, _ := e.Info()
				if info != nil && time.Since(info.ModTime()) > 24*time.Hour {
					continue
				}
				f, err := os.Open(filepath.Join(logDir, e.Name()))
				if err != nil {
					continue
				}
				sc := bufio.NewScanner(f)
				sc.Buffer(make([]byte, 1<<20), 1<<20)
				errCount := 0
				lastLine := ""
				for sc.Scan() {
					line := sc.Text()
					if strings.Contains(line, " - ERROR - ") {
						errCount++
						lastLine = line
					}
				}
				f.Close()
				if errCount > 0 {
					recentErr = append(recentErr, fmt.Sprintf("%s: %d ERROR(s)", e.Name(), errCount))
					_ = lastLine
				}
			}
			if len(recentErr) == 0 {
				pass("plugin logs", "no ERROR in recent plugin logs")
			} else {
				warn("plugin logs", strings.Join(recentErr, "; "))
			}
		}

		fmt.Println()
		if problems > 0 {
			return fmt.Errorf("doctor found %d problem(s)", problems)
		}
		fmt.Println("All checks passed.")
		return nil
	},
}

func init() {
	rootCmd.AddCommand(doctorCmd)
}
