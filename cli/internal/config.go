package internal

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// AuthConfig holds the port and token read from cli-auth.json
type AuthConfig struct {
	Port  int    `json:"port"`
	Token string `json:"token"`
}

// ClientConfig holds the shared local client settings.
type ClientConfig struct {
	DataPath string `json:"dataPath"`
}

func focusanyRoot() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".focusany"), nil
}

func defaultClientConfig() (*ClientConfig, error) {
	root, err := focusanyRoot()
	if err != nil {
		return nil, err
	}
	return &ClientConfig{DataPath: filepath.Join(root, "data")}, nil
}

func expandHome(value string) (string, error) {
	if value != "~" && !strings.HasPrefix(value, "~/") && !strings.HasPrefix(value, "~"+string(filepath.Separator)) {
		return value, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	if value == "~" {
		return home, nil
	}
	return filepath.Join(home, value[2:]), nil
}

func writeClientConfig(filePath string, cfg *ClientConfig) error {
	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, b, 0644)
}

// LoadClientConfig reads ~/.focusany/client.json and creates it when missing.
func LoadClientConfig() (*ClientConfig, error) {
	root, err := focusanyRoot()
	if err != nil {
		return nil, err
	}
	filePath := filepath.Join(root, "client.json")
	defaultCfg, err := defaultClientConfig()
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		if err := writeClientConfig(filePath, defaultCfg); err != nil {
			return nil, fmt.Errorf("cannot create %s: %w", filePath, err)
		}
		return defaultCfg, nil
	} else if err != nil {
		return nil, fmt.Errorf("cannot stat %s: %w", filePath, err)
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("cannot read %s: %w", filePath, err)
	}
	var cfg ClientConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("invalid client.json: %w", err)
	}
	if strings.TrimSpace(cfg.DataPath) == "" {
		cfg.DataPath = defaultCfg.DataPath
	}
	cfg.DataPath, err = expandHome(cfg.DataPath)
	if err != nil {
		return nil, err
	}
	cfg.DataPath, err = filepath.Abs(cfg.DataPath)
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

// LoadAuthConfig reads cli-auth.json from the configured FocusAny dataPath.
func LoadAuthConfig() (*AuthConfig, error) {
	clientCfg, err := LoadClientConfig()
	if err != nil {
		return nil, fmt.Errorf("cannot load client config: %w", err)
	}
	filePath := filepath.Join(clientCfg.DataPath, "cli-auth.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("cannot read %s: %w (is FocusAny running?)", filePath, err)
	}
	var cfg AuthConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("invalid cli-auth.json: %w", err)
	}
	if cfg.Port == 0 || cfg.Token == "" {
		return nil, fmt.Errorf("cli-auth.json is incomplete (port=%d, token empty=%v)", cfg.Port, cfg.Token == "")
	}
	return &cfg, nil
}
