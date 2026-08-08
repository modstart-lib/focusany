package cmd

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"strings"
	"testing"
)

// captureStdout runs f and returns captured stdout content.
func captureStdout(f func()) string {
	r, w, err := os.Pipe()
	if err != nil {
		panic(err)
	}
	stdout := os.Stdout
	os.Stdout = w

	f()

	w.Close()
	os.Stdout = stdout

	var buf bytes.Buffer
	io.Copy(&buf, r)
	r.Close()
	return buf.String()
}

func TestVersionCommand(t *testing.T) {
	// Set the version string for testing
	appVersion = "1.2.3-test"

	output := captureStdout(func() {
		if err := versionCmd.RunE(versionCmd, []string{}); err != nil {
			t.Fatalf("version command failed: %v", err)
		}
	})

	output = strings.TrimSpace(output)
	var result map[string]string
	if err := json.Unmarshal([]byte(output), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, output)
	}
	if result["version"] != "1.2.3-test" {
		t.Fatalf("expected version 1.2.3-test, got %q", result["version"])
	}
}

func TestExecuteSetsAppVersion(t *testing.T) {
	// Verify that Execute() sets the appVersion package variable.
	// Execute runs rootCmd which prints help to stdout; suppress that.
	_ = captureStdout(func() {
		Execute("4.5.6")
	})
	// We ignore the help text output; just verify appVersion was set.

	// Confirm the version command uses the injected version.
	output2 := captureStdout(func() {
		if err := versionCmd.RunE(versionCmd, []string{}); err != nil {
			t.Fatalf("version command failed: %v", err)
		}
	})

	output2 = strings.TrimSpace(output2)
	var result map[string]string
	if err := json.Unmarshal([]byte(output2), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, output2)
	}
	if result["version"] != "4.5.6" {
		t.Fatalf("expected version 4.5.6, got %q", result["version"])
	}
}

func TestRootCommandHelp(t *testing.T) {
	output := captureStdout(func() {
		rootCmd.SetArgs([]string{"--help"})
		if err := rootCmd.Execute(); err != nil {
			t.Fatalf("help command failed: %v", err)
		}
	})

	if !strings.Contains(output, "FocusAny command-line tool") {
		t.Fatalf("help output should contain 'FocusAny command-line tool', got: %s", output)
	}
	if !strings.Contains(output, "version") {
		t.Fatalf("help output should mention 'version' subcommand, got: %s", output)
	}
	if !strings.Contains(output, "plugin") {
		t.Fatalf("help output should mention 'plugin' subcommand, got: %s", output)
	}
}

func TestRootCommandHasSubcommands(t *testing.T) {
	cmds := rootCmd.Commands()
	cmdNames := make(map[string]bool)
	for _, c := range cmds {
		cmdNames[c.Name()] = true
	}

	if !cmdNames["version"] {
		t.Fatal("expected 'version' subcommand to be registered")
	}
	if !cmdNames["plugin"] {
		t.Fatal("expected 'plugin' subcommand to be registered")
	}
}

func TestVersionSubCommandHasUse(t *testing.T) {
	if versionCmd.Use != "version" {
		t.Fatalf("expected Use 'version', got %q", versionCmd.Use)
	}
	if versionCmd.Short == "" {
		t.Fatal("version command should have a Short description")
	}
}

func TestPluginSubCommand(t *testing.T) {
	if pluginCmd.Use != "plugin" {
		t.Fatalf("expected Use 'plugin', got %q", pluginCmd.Use)
	}
	if pluginCmd.Short == "" {
		t.Fatal("plugin command should have a Short description")
	}

	// Check plugin list subcommand exists
	subCmds := pluginCmd.Commands()
	found := false
	for _, c := range subCmds {
		if c.Name() == "list" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("plugin command should have 'list' subcommand")
	}
}

func TestPluginManageSubCommands(t *testing.T) {
	want := map[string]bool{
		"install":   true,
		"uninstall": true,
		"run":       true,
		"info":      true,
	}
	for _, c := range pluginCmd.Commands() {
		delete(want, c.Name())
	}
	if len(want) > 0 {
		names := make([]string, 0, len(want))
		for n := range want {
			names = append(names, n)
		}
		t.Fatalf("plugin command is missing subcommands: %v", names)
	}
}

func TestPluginInstallRequiresPath(t *testing.T) {
	// install with no args must fail at the cobra Args layer.
	if err := pluginInstallCmd.Args(pluginInstallCmd, []string{}); err == nil {
		t.Fatal("install with no args should error")
	}
	if err := pluginInstallCmd.Args(pluginInstallCmd, []string{"a", "b"}); err == nil {
		t.Fatal("install with two args should error")
	}
}

func TestPluginRunAcceptsOneOrTwoArgs(t *testing.T) {
	if err := pluginRunCmd.Args(pluginRunCmd, []string{}); err == nil {
		t.Fatal("run with no args should error")
	}
	if err := pluginRunCmd.Args(pluginRunCmd, []string{"A"}); err != nil {
		t.Fatalf("run with one arg should be accepted: %v", err)
	}
	if err := pluginRunCmd.Args(pluginRunCmd, []string{"A", "B"}); err != nil {
		t.Fatalf("run with two args should be accepted: %v", err)
	}
	if err := pluginRunCmd.Args(pluginRunCmd, []string{"A", "B", "C"}); err == nil {
		t.Fatal("run with three args should error")
	}
}

func TestMcpSubCommands(t *testing.T) {
	want := map[string]bool{"tools": true, "call": true}
	for _, c := range mcpCmd.Commands() {
		delete(want, c.Name())
	}
	if len(want) > 0 {
		names := make([]string, 0, len(want))
		for n := range want {
			names = append(names, n)
		}
		t.Fatalf("mcp command is missing subcommands: %v", names)
	}
}

func TestMcpCallRequiresTwoArgs(t *testing.T) {
	if err := mcpCallCmd.Args(mcpCallCmd, []string{}); err == nil {
		t.Fatal("call with no args should error")
	}
	if err := mcpCallCmd.Args(mcpCallCmd, []string{"P"}); err == nil {
		t.Fatal("call with one arg should error")
	}
	if err := mcpCallCmd.Args(mcpCallCmd, []string{"P", "t"}); err != nil {
		t.Fatalf("call with two args should be accepted: %v", err)
	}
}
