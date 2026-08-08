package internal

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// --- plugin config checking (pre-publish validation) ------------------------

type CheckResult struct {
	Valid  bool     `json:"valid"`
	Errors []string `json:"errors,omitempty"`
	Warns  []string `json:"warns,omitempty"`
}

var semverRe = regexp.MustCompile(`^\d+\.\d+\.\d+$`)
var nameRe = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9]*$`)

// CheckPluginConfig validates a plugin directory's config.json for release.
// fileChecks additionally verifies that referenced files (main/logo/preload)
// exist on disk — pass false when validating a raw config object.
func CheckPluginConfig(root string, fileChecks bool) (*CheckResult, error) {
	res := &CheckResult{Valid: true}
	cfgPath := filepath.Join(root, "config.json")
	raw, err := os.ReadFile(cfgPath)
	if err != nil {
		return nil, fmt.Errorf("cannot read %s: %w", cfgPath, err)
	}
	var cfg map[string]any
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return nil, fmt.Errorf("config.json is not valid JSON: %w", err)
	}

	fail := func(format string, args ...any) {
		res.Errors = append(res.Errors, fmt.Sprintf(format, args...))
		res.Valid = false
	}
	warn := func(format string, args ...any) {
		res.Warns = append(res.Warns, fmt.Sprintf(format, args...))
	}

	// name / version / title
	name, _ := cfg["name"].(string)
	if name == "" {
		fail("name 不能为空")
	} else if !nameRe.MatchString(name) {
		fail("name %q 应为大写驼峰命名（仅字母数字，字母开头）", name)
	}
	version, _ := cfg["version"].(string)
	if version == "" {
		fail("version 不能为空")
	} else if !semverRe.MatchString(version) {
		fail("version %q 应为 x.y.z 语义化版本", version)
	}
	title, _ := cfg["title"].(string)
	if title == "" {
		fail("title 不能为空")
	}

	// referenced files
	refs := []struct{ key, path string }{
		{"main", ""},
		{"logo", ""},
		{"preload", ""},
		{"mainView", ""},
	}
	for i := range refs {
		if v, ok := cfg[refs[i].key].(string); ok && v != "" {
			refs[i].path = v
		}
	}
	if refs[0].path == "" {
		fail("main 入口文件不能为空")
	}
	if fileChecks {
		for _, r := range refs {
			if r.path == "" {
				continue
			}
			if _, err := os.Stat(filepath.Join(root, r.path)); err != nil {
				fail("引用的文件不存在: %s (%s)", r.key, r.path)
			}
		}
	}

	// development env
	if dev, ok := cfg["development"].(map[string]any); ok {
		if env, _ := dev["env"].(string); env == "dev" {
			warn("development.env 为 dev，发布前应执行 release-prepare 切换为 prod")
		}
		if sd, _ := dev["showDevTools"].(bool); sd {
			warn("development.showDevTools 为 true，生产环境应关闭")
		}
	}

	// actions
	actions, _ := cfg["actions"].([]any)
	if len(actions) == 0 {
		fail("actions 不能为空")
	}
	seen := map[string]bool{}
	for i, a := range actions {
		am, ok := a.(map[string]any)
		if !ok {
			fail("actions[%d] 不是对象", i)
			continue
		}
		an, _ := am["name"].(string)
		if an == "" {
			fail("actions[%d].name 不能为空", i)
		} else if seen[an] {
			fail("actions[%d].name %q 重复", i, an)
		}
		seen[an] = true
		matches, _ := am["matches"].([]any)
		if len(matches) == 0 {
			fail("actions[%d].matches 不能为空（至少一个匹配规则）", i)
		}
	}

	// mcp tools
	if mcp, ok := cfg["mcp"].(map[string]any); ok {
		tools, _ := mcp["tools"].([]any)
		for i, t := range tools {
			tm, ok := t.(map[string]any)
			if !ok {
				fail("mcp.tools[%d] 不是对象", i)
				continue
			}
			tn, _ := tm["name"].(string)
			if tn == "" {
				fail("mcp.tools[%d].name 不能为空", i)
			} else if strings.ContainsAny(tn, " \t") {
				fail("mcp.tools[%d].name %q 不能包含空格（建议小写+点号）", i, tn)
			}
			if _, ok := tm["description"].(string); !ok {
				fail("mcp.tools[%d].description 不能为空", i)
			}
			if _, ok := tm["inputSchema"].(map[string]any); !ok {
				fail("mcp.tools[%d].inputSchema 必须为对象", i)
			}
		}
	}

	// permissions enum
	if perms, ok := cfg["permissions"].([]any); ok {
		valid := map[string]bool{"ClipboardManage": true, "Api": true, "File": true}
		for _, p := range perms {
			ps, _ := p.(string)
			if !valid[ps] {
				fail("permissions 包含非法值: %v", p)
			}
		}
	}

	return res, nil
}
