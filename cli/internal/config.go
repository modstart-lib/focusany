package internal

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// AuthConfig holds the port and token read from cli-auth.json
type AuthConfig struct {
	Port  int    `json:"port"`
	Token string `json:"token"`
}

// userDataDir returns the Electron userData directory path matching app.getPath('userData')
// which uses the app name "focusany".
func userDataDir() (string, error) {
	switch runtime.GOOS {
	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, "Library", "Application Support", "focusany"), nil
	case "windows":
		appData := os.Getenv("APPDATA")
		if appData == "" {
			return "", fmt.Errorf("APPDATA environment variable not set")
		}
		return filepath.Join(appData, "focusany"), nil
	default:
		// Linux: XDG_CONFIG_HOME or ~/.config
		configDir := os.Getenv("XDG_CONFIG_HOME")
		if configDir == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			configDir = filepath.Join(home, ".config")
		}
		return filepath.Join(configDir, "focusany"), nil
	}
}

// LoadAuthConfig reads cli-auth.json from the focusany userData directory.
func LoadAuthConfig() (*AuthConfig, error) {
	dir, err := userDataDir()
	if err != nil {
		return nil, fmt.Errorf("cannot determine userData directory: %w", err)
	}
	filePath := filepath.Join(dir, "cli-auth.json")
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
