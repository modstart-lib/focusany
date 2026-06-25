package internal

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func withHome(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("HOME", dir)
	t.Setenv("USERPROFILE", dir)
	return dir
}

func TestFocusAnyRoot(t *testing.T) {
	home := withHome(t)
	root, err := focusanyRoot()
	if err != nil {
		t.Fatalf("focusanyRoot failed: %v", err)
	}
	want := filepath.Join(home, ".focusany")
	if root != want {
		t.Fatalf("focusanyRoot = %q, want %q", root, want)
	}
}

func TestDefaultClientConfig(t *testing.T) {
	home := withHome(t)
	cfg, err := defaultClientConfig()
	if err != nil {
		t.Fatalf("defaultClientConfig failed: %v", err)
	}
	want := filepath.Join(home, ".focusany", "data")
	if cfg.DataPath != want {
		t.Fatalf("DataPath = %q, want %q", cfg.DataPath, want)
	}
}

func TestExpandHome(t *testing.T) {
	home := withHome(t)

	tests := []struct {
		name  string
		value string
		want  string
	}{
		{"no tilde", "/some/path", "/some/path"},
		{"relative path", "relative/path", "relative/path"},
		{"just tilde", "~", home},
		{"tilde with path", "~/custom", filepath.Join(home, "custom")},
		{"tilde nested path", "~/a/b/c", filepath.Join(home, "a/b/c")},
		{"empty string", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := expandHome(tt.value)
			if err != nil {
				t.Fatalf("expandHome(%q) failed: %v", tt.value, err)
			}
			if got != tt.want {
				t.Fatalf("expandHome(%q) = %q, want %q", tt.value, got, tt.want)
			}
		})
	}
}

func TestWriteClientConfig(t *testing.T) {
	home := withHome(t)
	filePath := filepath.Join(home, ".focusany", "client.json")
	cfg := &ClientConfig{DataPath: "/custom/path"}

	if err := writeClientConfig(filePath, cfg); err != nil {
		t.Fatalf("writeClientConfig failed: %v", err)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("cannot read written file: %v", err)
	}

	var readCfg ClientConfig
	if err := json.Unmarshal(data, &readCfg); err != nil {
		t.Fatalf("invalid JSON written: %v", err)
	}
	if readCfg.DataPath != cfg.DataPath {
		t.Fatalf("written DataPath = %q, want %q", readCfg.DataPath, cfg.DataPath)
	}
}

func TestLoadClientConfigCreatesDefault(t *testing.T) {
	home := withHome(t)
	cfg, err := LoadClientConfig()
	if err != nil {
		t.Fatalf("LoadClientConfig failed: %v", err)
	}
	want := filepath.Join(home, ".focusany", "data")
	if cfg.DataPath != want {
		t.Fatalf("DataPath = %q, want %q", cfg.DataPath, want)
	}
	if _, err := os.Stat(filepath.Join(home, ".focusany", "client.json")); err != nil {
		t.Fatalf("client.json was not created: %v", err)
	}
}

func TestLoadClientConfigReadsCustomDataPath(t *testing.T) {
	home := withHome(t)
	clientPath := filepath.Join(home, ".focusany", "client.json")
	if err := os.MkdirAll(filepath.Dir(clientPath), 0755); err != nil {
		t.Fatal(err)
	}
	b, err := json.Marshal(ClientConfig{DataPath: "~/custom-data"})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(clientPath, b, 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := LoadClientConfig()
	if err != nil {
		t.Fatalf("LoadClientConfig failed: %v", err)
	}
	want := filepath.Join(home, "custom-data")
	if cfg.DataPath != want {
		t.Fatalf("DataPath = %q, want %q", cfg.DataPath, want)
	}
}

func TestLoadClientConfigEmptyDataPath(t *testing.T) {
	home := withHome(t)
	clientPath := filepath.Join(home, ".focusany", "client.json")
	if err := os.MkdirAll(filepath.Dir(clientPath), 0755); err != nil {
		t.Fatal(err)
	}
	// Empty DataPath should fall back to default
	b, err := json.Marshal(ClientConfig{DataPath: ""})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(clientPath, b, 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := LoadClientConfig()
	if err != nil {
		t.Fatalf("LoadClientConfig failed: %v", err)
	}
	want := filepath.Join(home, ".focusany", "data")
	if cfg.DataPath != want {
		t.Fatalf("DataPath = %q, want %q", cfg.DataPath, want)
	}
}

func TestLoadClientConfigSpacesOnlyDataPath(t *testing.T) {
	home := withHome(t)
	clientPath := filepath.Join(home, ".focusany", "client.json")
	if err := os.MkdirAll(filepath.Dir(clientPath), 0755); err != nil {
		t.Fatal(err)
	}
	// Whitespace-only DataPath should fall back to default
	b, err := json.Marshal(ClientConfig{DataPath: "   "})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(clientPath, b, 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := LoadClientConfig()
	if err != nil {
		t.Fatalf("LoadClientConfig failed: %v", err)
	}
	want := filepath.Join(home, ".focusany", "data")
	if cfg.DataPath != want {
		t.Fatalf("DataPath = %q, want %q", cfg.DataPath, want)
	}
}

func TestLoadClientConfigInvalidJSON(t *testing.T) {
	withHome(t)
	clientPath := filepath.Join(withHome(t), ".focusany", "client.json")
	if err := os.MkdirAll(filepath.Dir(clientPath), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(clientPath, []byte("not-json"), 0644); err != nil {
		t.Fatal(err)
	}
	_, err := LoadClientConfig()
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
	if !strings.Contains(err.Error(), "invalid client.json") {
		t.Fatalf("unexpected error message: %v", err)
	}
}

func TestLoadAuthConfig(t *testing.T) {
	home := withHome(t)
	clientPath := filepath.Join(home, ".focusany", "client.json")
	if err := os.MkdirAll(filepath.Dir(clientPath), 0755); err != nil {
		t.Fatal(err)
	}
	defaultCfg, err := defaultClientConfig()
	if err != nil {
		t.Fatal(err)
	}
	// Create auth file in the data directory
	authDir := defaultCfg.DataPath
	if err := os.MkdirAll(authDir, 0755); err != nil {
		t.Fatal(err)
	}
	authCfg := AuthConfig{Port: 12345, Token: "test-token"}
	b, err := json.Marshal(authCfg)
	if err != nil {
		t.Fatal(err)
	}
	authPath := filepath.Join(authDir, "cli-auth.json")
	if err := os.WriteFile(authPath, b, 0644); err != nil {
		t.Fatal(err)
	}
	got, err := LoadAuthConfig()
	if err != nil {
		t.Fatalf("LoadAuthConfig failed: %v", err)
	}
	if got.Port != 12345 {
		t.Fatalf("Port = %d, want 12345", got.Port)
	}
	if got.Token != "test-token" {
		t.Fatalf("Token = %q, want %q", got.Token, "test-token")
	}
}

func TestLoadAuthConfigMissingFile(t *testing.T) {
	withHome(t)
	_, err := LoadAuthConfig()
	if err == nil {
		t.Fatal("expected error for missing auth file, got nil")
	}
	if !strings.Contains(err.Error(), "cli-auth.json") {
		t.Fatalf("expected error about cli-auth.json, got: %v", err)
	}
}

func TestLoadAuthConfigIncomplete(t *testing.T) {
	home := withHome(t)
	clientPath := filepath.Join(home, ".focusany", "client.json")
	if err := os.MkdirAll(filepath.Dir(clientPath), 0755); err != nil {
		t.Fatal(err)
	}
	defaultCfg, err := defaultClientConfig()
	if err != nil {
		t.Fatal(err)
	}
	authDir := defaultCfg.DataPath
	if err := os.MkdirAll(authDir, 0755); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name   string
		port   int
		token  string
		hasErr bool
	}{
		{"zero port and empty token", 0, "", true},
		{"zero port", 0, "token123", true},
		{"empty token", 12345, "", true},
		{"valid", 12345, "token123", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			authCfg := AuthConfig{Port: tt.port, Token: tt.token}
			b, err := json.Marshal(authCfg)
			if err != nil {
				t.Fatal(err)
			}
			authPath := filepath.Join(authDir, "cli-auth.json")
			if err := os.WriteFile(authPath, b, 0644); err != nil {
				t.Fatal(err)
			}
			_, err = LoadAuthConfig()
			if tt.hasErr && err == nil {
				t.Fatal("expected error but got nil")
			}
			if !tt.hasErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
