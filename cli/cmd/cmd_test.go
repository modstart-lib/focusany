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
func captureStdout(f func()) (out string) {
	r, w, err := os.Pipe()
	if err != nil {
		panic(err)
	}
	stdout := os.Stdout
	os.Stdout = w

	// Restore stdout and collect the output even when f calls t.Fatalf
	// (runtime.Goexit) or panics.
	defer func() {
		os.Stdout = stdout
		w.Close()
		var buf bytes.Buffer
		_, _ = io.Copy(&buf, r)
		r.Close()
		out = buf.String()
	}()

	f()
	return
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

func TestPluginEvalArgs(t *testing.T) {
	if err := pluginEvalCmd.Args(pluginEvalCmd, []string{}); err == nil {
		t.Fatal("eval with no args should error")
	}
	// A name alone is valid: the script may come from --file.
	if err := pluginEvalCmd.Args(pluginEvalCmd, []string{"Nat"}); err != nil {
		t.Fatalf("eval with only a name should be accepted: %v", err)
	}
	if err := pluginEvalCmd.Args(pluginEvalCmd, []string{"Nat", "1+1"}); err != nil {
		t.Fatalf("eval with name+script should be accepted: %v", err)
	}
	if err := pluginEvalCmd.Args(pluginEvalCmd, []string{"a", "b", "c"}); err == nil {
		t.Fatal("eval with three args should error")
	}
}

func TestPluginEvalRequiresScript(t *testing.T) {
	old := pluginEvalFile
	defer func() { pluginEvalFile = old }()
	pluginEvalFile = ""

	err := pluginEvalCmd.RunE(pluginEvalCmd, []string{"Nat"})
	if err == nil || !strings.Contains(err.Error(), "missing script") {
		t.Fatalf("expected a missing script error, got %v", err)
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

func TestDoctorCommandRegistered(t *testing.T) {
	found := false
	for _, c := range rootCmd.Commands() {
		if c.Name() == "doctor" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("doctor command should be registered")
	}
}

func TestPluginSmokeCommandRegistered(t *testing.T) {
	found := false
	for _, c := range pluginCmd.Commands() {
		if c.Name() == "smoke" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("plugin smoke should be registered")
	}
	if err := pluginSmokeCmd.Args(pluginSmokeCmd, []string{}); err == nil {
		t.Fatal("smoke requires a target")
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

func TestLogCommandRegistered(t *testing.T) {
	found := false
	for _, c := range rootCmd.Commands() {
		if c.Name() == "log" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("log command should be registered")
	}
	if logCmd.Short == "" {
		t.Fatal("log command should have a Short description")
	}
}

func TestPluginDevSubCommands(t *testing.T) {
	want := map[string]bool{"check": true, "release-prepare": true, "package": true}
	for _, c := range pluginCmd.Commands() {
		delete(want, c.Name())
	}
	if len(want) > 0 {
		names := make([]string, 0, len(want))
		for n := range want {
			names = append(names, n)
		}
		t.Fatalf("plugin command is missing dev subcommands: %v", names)
	}
}

func TestSkillCommandRegistered(t *testing.T) {
	found := false
	for _, c := range rootCmd.Commands() {
		if c.Name() == "skill" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected 'skill' subcommand to be registered")
	}
	if skillCmd.Short == "" {
		t.Fatal("skill command should have a Short description")
	}
	aliasNames := strings.Join(skillCmd.Aliases, ",")
	if aliasNames != "usage,guide" {
		t.Fatalf("skill command aliases should be usage,guide, got %q", aliasNames)
	}
}

func TestSkillOutputCoversUsage(t *testing.T) {
	output := captureStdout(func() {
		if err := skillCmd.RunE(skillCmd, []string{}); err != nil {
			t.Fatalf("skill command failed: %v", err)
		}
	})

	for _, want := range []string{
		"# FocusAny 使用方式",
		"Alt + Space",
		"focusany doctor",
		"FOCUSANY_DATA_ROOT",
		"https://focusany.com",
	} {
		if !strings.Contains(output, want) {
			t.Fatalf("skill output should contain %q", want)
		}
	}
	if !strings.HasSuffix(output, "\n") {
		t.Fatal("skill output should end with a newline")
	}

	// Every command line in the guide must start with a real subcommand.
	known := map[string]bool{}
	for _, c := range rootCmd.Commands() {
		known[c.Name()] = true
	}
	for _, line := range strings.Split(output, "\n") {
		if !strings.HasPrefix(line, "focusany ") {
			continue
		}
		name := strings.Fields(line)[1]
		if !known[name] {
			t.Fatalf("guide mentions unknown command %q", name)
		}
	}
}

func TestSkillRejectsArgs(t *testing.T) {
	if err := skillCmd.Args(skillCmd, []string{"extra"}); err == nil {
		t.Fatal("skill with unexpected args should error")
	}
	if err := skillCmd.Args(skillCmd, []string{}); err != nil {
		t.Fatalf("skill with no args should be accepted: %v", err)
	}
}
