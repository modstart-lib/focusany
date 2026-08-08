package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"focusany-cli/internal"

	"github.com/spf13/cobra"
)

// FocusAny's built-in MCP server speaks JSON-RPC 2.0 over HTTP POST at
// http://127.0.0.1:61000/mcp. Tool names are "<PluginName>-<tool.name>",
// e.g. "BentoSlides-bento.new_deck". No auth token is required on this port.

const mcpEndpoint = "http://127.0.0.1:61000/mcp"

var mcpCmd = &cobra.Command{
	Use:   "mcp",
	Short: "Talk to the local FocusAny MCP server (list / call plugin tools)",
}

func mcpRPC(method string, params map[string]any, id int) (map[string]any, error) {
	body := map[string]any{
		"jsonrpc": "2.0",
		"id":      id,
		"method":  method,
		"params":  params,
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	resp, err := http.Post(mcpEndpoint, "application/json", bytes.NewReader(raw))
	if err != nil {
		return nil, fmt.Errorf("MCP server unreachable at %s (is FocusAny running?): %w", mcpEndpoint, err)
	}
	defer resp.Body.Close()
	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var result map[string]any
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return nil, fmt.Errorf("invalid MCP response: %s", string(respBytes))
	}
	return result, nil
}

var mcpToolsCmd = &cobra.Command{
	Use:   "tools",
	Short: "List all MCP tools exposed by installed plugins",
	RunE: func(cmd *cobra.Command, args []string) error {
		result, err := mcpRPC("tools/list", map[string]any{}, 1)
		if err != nil {
			return err
		}
		if errMsg, ok := result["error"].(map[string]any); ok {
			return fmt.Errorf("MCP error: %v", errMsg["message"])
		}
		return internal.PrintJSON(result["result"])
	},
}

var mcpCallCmd = &cobra.Command{
	Use:   "call <pluginName> <toolName> [jsonArgs]",
	Short: "Call a plugin's MCP tool",
	Long: "Call a plugin's MCP tool. jsonArgs is optional; when omitted an empty " +
		"object is passed. Example: focusany mcp call BentoSlides bento.new_deck '{\"title\":\"demo\"}'",
	Args: cobra.RangeArgs(2, 3),
	RunE: func(cmd *cobra.Command, args []string) error {
		pluginName := args[0]
		toolName := args[1]
		params := map[string]any{}
		if len(args) == 3 && args[2] != "" {
			if err := json.Unmarshal([]byte(args[2]), &params); err != nil {
				return fmt.Errorf("jsonArgs is not valid JSON: %w", err)
			}
		}
		name := pluginName + "-" + toolName
		result, err := mcpRPC("tools/call", map[string]any{"name": name, "arguments": params}, 1)
		if err != nil {
			return err
		}
		if errMsg, ok := result["error"].(map[string]any); ok {
			return fmt.Errorf("MCP tool error: %v", errMsg["message"])
		}
		return internal.PrintJSON(result["result"])
	},
}

func init() {
	mcpCmd.AddCommand(mcpToolsCmd)
	mcpCmd.AddCommand(mcpCallCmd)
}
