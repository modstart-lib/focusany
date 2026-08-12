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
var versionTitleRe = regexp.MustCompile(`^##\s+(\d+\.\d+\.\d+)\s+\S`)

var validActionTypes = map[string]bool{
	"command": true, "web": true, "code": true, "backend": true, "view": true,
}
var validMatchTypes = map[string]bool{
	"text": true, "key": true, "regex": true, "file": true, "image": true, "window": true, "editor": true,
}

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
		at, _ := am["type"].(string)
		if at == "" {
			at = "web" // 默认值
		}
		if !validActionTypes[at] {
			fail("actions[%d].type %q 非法（应为 command/web/code/backend/view）", i, at)
		}
		matches, _ := am["matches"].([]any)
		if len(matches) == 0 {
			fail("actions[%d].matches 不能为空（至少一个匹配规则）", i)
		}
		for j, m := range matches {
			switch mt := m.(type) {
			case string:
				if strings.TrimSpace(mt) == "" {
					fail("actions[%d].matches[%d] 字符串匹配不能为空", i, j)
				}
			case map[string]any:
				t, _ := mt["type"].(string)
				if t == "" {
					fail("actions[%d].matches[%d] 缺少 type 字段", i, j)
				} else if !validMatchTypes[t] {
					fail("actions[%d].matches[%d].type %q 非法（应为 text/key/regex/file/image/window/editor）", i, j, t)
				}
			default:
				fail("actions[%d].matches[%d] 必须是字符串或对象", i, j)
			}
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

	// ---- release docs (content.md / release.md / preview.md) ----
	if fileChecks {
		checkReleaseDocs(root, cfg, version, res, fail, warn)
	}

	return res, nil
}

// checkReleaseDocs validates content.md / release.md / preview.md presence and
// format, and that release.md's top version matches config.json version.
func checkReleaseDocs(
	root string,
	cfg map[string]any,
	configVersion string,
	res *CheckResult,
	fail func(string, ...any),
	warn func(string, ...any),
) {
	contentDoc, releaseDoc, previewDoc := "content.md", "release.md", "preview.md"
	if dev, ok := cfg["development"].(map[string]any); ok {
		if v, ok := dev["contentDoc"].(string); ok && v != "" {
			contentDoc = v
		}
		if v, ok := dev["releaseDoc"].(string); ok && v != "" {
			releaseDoc = v
		}
		if v, ok := dev["previewDoc"].(string); ok && v != "" {
			previewDoc = v
		}
	}

	// content.md — 插件说明文档（必须）
	if _, err := os.Stat(filepath.Join(root, contentDoc)); err != nil {
		fail("缺少插件说明文档 %s（development.contentDoc 指向它，展示在插件详情页）", contentDoc)
	}

	// release.md — 更新日志（必须 + 格式 + 版本一致）
	releasePath := filepath.Join(root, releaseDoc)
	raw, err := os.ReadFile(releasePath)
	if err != nil {
		fail("缺少更新日志 %s（development.releaseDoc 指向它，每次修改插件都要更新）", releaseDoc)
	} else {
		checkReleaseFormat(string(raw), releaseDoc, configVersion, res, fail)
	}

	// preview.md — 预览图（可选，每行一个图片链接）
	if data, err := os.ReadFile(filepath.Join(root, previewDoc)); err == nil {
		for i, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			if !strings.HasPrefix(line, "http://") && !strings.HasPrefix(line, "https://") && !strings.HasPrefix(line, "./") && !strings.HasPrefix(line, "/") {
				warn("%s 第 %d 行不是图片链接（应为 http(s):// 或相对路径，每行一个）", previewDoc, i+1)
			}
		}
	}

	// .faignore — 建议存在（发布包过滤）
	if _, err := os.Stat(filepath.Join(root, ".faignore")); err != nil {
		warn("缺少 .faignore（发布 zip 会包含多余文件，建议添加，语法类似 .gitignore）")
	}
}

// checkReleaseFormat validates the release.md structure:
//
//	## 1.1.0 一句话概括
//
//	更新内容详情
//
//	---
//
//	## 1.0.0 初始版本发布
//	...
//
// Top version must equal config.json version; multi-version logs need ---
// separators between every pair.
func checkReleaseFormat(content, name, configVersion string, res *CheckResult, fail func(string, ...any)) {
	var titles []string
	for _, line := range strings.Split(content, "\n") {
		t := strings.TrimSpace(line)
		if strings.HasPrefix(t, "## ") {
			titles = append(titles, t)
		}
	}
	if len(titles) == 0 {
		fail("%s 缺少版本标题（格式：## x.x.x 一句话概括）", name)
		return
	}
	top := titles[0]
	m := versionTitleRe.FindStringSubmatch(top)
	if m == nil {
		fail("%s 顶部标题格式错误：%q（应为「## x.x.x 一句话概括」，版本号 x.y.z）", name, top)
	} else if m[1] != configVersion {
		fail("%s 顶部版本 %s 与 config.json 的 version %s 不一致（每次修改插件需同步升级）", name, m[1], configVersion)
	}
	if len(titles) > 1 {
		sepCount := strings.Count(content, "\n---")
		if sepCount < len(titles)-1 {
			fail("%s 有 %d 个版本但只找到 %d 个「---」分隔符（多个版本之间必须用 --- 分隔，最新版本置顶）", name, len(titles), sepCount)
		}
	}
}
