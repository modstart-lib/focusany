package internal

import (
	"archive/zip"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// --- .faignore --------------------------------------------------------------

func TestIsIgnored(t *testing.T) {
	rules := []string{".DS_Store", "node_modules/", "dist/", "*.log", ".git/"}
	cases := []struct {
		path string
		want bool
	}{
		{".DS_Store", true},
		{"node_modules/x/y.js", true},
		{"dist/index.html", true},
		{"a/b/debug.log", true},
		{".git/config", true},
		{"config.json", false},
		{"preload.cjs", false},
		{"assets/logo.svg", false},
	}
	for _, c := range cases {
		if got := isIgnored(c.path, rules); got != c.want {
			t.Errorf("isIgnored(%q) = %v, want %v", c.path, got, c.want)
		}
	}
}

// --- zip --------------------------------------------------------------------

func TestZipPluginRespectsFaignore(t *testing.T) {
	dir := t.TempDir()
	write := func(name, content string) {
		p := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(p), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}
	write("config.json", `{"name":"TestPlugin","version":"1.0.0"}`)
	write(".faignore", "# test\n.DS_Store\nsecret/\n*.tmp\n")
	write("index.html", "<h1>hi</h1>")
	write("secret/private.key", "key")
	write("notes.tmp", "tmp")

	out := filepath.Join(t.TempDir(), "out.zip")
	if err := ZipPlugin(dir, out); err != nil {
		t.Fatalf("ZipPlugin failed: %v", err)
	}
	zr, err := zip.OpenReader(out)
	if err != nil {
		t.Fatal(err)
	}
	defer zr.Close()
	var names []string
	for _, f := range zr.File {
		names = append(names, f.Name)
	}
	joined := strings.Join(names, ",")
	for _, want := range []string{"config.json", "index.html"} {
		if !strings.Contains(joined, want) {
			t.Errorf("zip should contain %s, got: %s", want, joined)
		}
	}
	for _, banned := range []string{"secret/", "notes.tmp", ".DS_Store"} {
		if strings.Contains(joined, banned) {
			t.Errorf("zip should NOT contain %s, got: %s", banned, joined)
		}
	}
}

// --- log tailing ------------------------------------------------------------

func TestTailLinesAndFilter(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "log_20260101.log")
	var sb strings.Builder
	for i := 1; i <= 100; i++ {
		if i%2 == 0 {
			sb.WriteString("2026-01-01 00:00:00 - ERROR - t - data\n")
		} else {
			sb.WriteString("2026-01-01 00:00:00 - INFO - t - data\n")
		}
	}
	if err := os.WriteFile(p, []byte(sb.String()), 0644); err != nil {
		t.Fatal(err)
	}
	lines, err := TailLines(p, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(lines) != 10 {
		t.Fatalf("TailLines returned %d lines, want 10", len(lines))
	}
	if got := len(FilterLevel(lines, "ERROR")); got != 5 {
		t.Fatalf("ERROR filter returned %d, want 5", got)
	}
}

// --- config checking --------------------------------------------------------

func TestCheckPluginConfig(t *testing.T) {
	dir := t.TempDir()
	write := func(name, content string) {
		p := filepath.Join(dir, name)
		if err := os.WriteFile(p, []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}
	// valid plugin
	write("config.json", `{
		"name": "GoodPlugin", "version": "1.0.0", "title": "好插件",
		"main": "index.html", "logo": "logo.svg",
		"actions": [{"name": "open", "title": "open", "type": "web", "matches": ["good"]}],
		"mcp": {"tools": [{"name": "good.tool", "description": "t", "inputSchema": {"type": "object", "properties": {}}}]}
	}`)
	write("index.html", "<h1>x</h1>")
	write("logo.svg", "<svg/>")
	write("content.md", "## 插件说明\n\n好插件")
	write("release.md", "## 1.0.0 初始版本发布\n\n初始版本发布\n")
	write(".faignore", ".DS_Store\n")
	res, err := CheckPluginConfig(dir, true)
	if err != nil {
		t.Fatal(err)
	}
	if !res.Valid {
		t.Fatalf("valid plugin rejected: %v", res.Errors)
	}

	// invalid plugin: bad name, missing main file, dev env
	write("config.json", `{
		"name": "bad name", "version": "1", "title": "",
		"main": "missing.html",
		"actions": [],
		"development": {"env": "dev", "showDevTools": true}
	}`)
	res, err = CheckPluginConfig(dir, true)
	if err != nil {
		t.Fatal(err)
	}
	if res.Valid {
		t.Fatal("invalid plugin should be rejected")
	}
	if len(res.Warns) == 0 {
		t.Fatal("dev env should produce warnings")
	}
}

func TestCheckReleaseDocs(t *testing.T) {
	dir := t.TempDir()
	write := func(name, content string) {
		p := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(p), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}
	write("config.json", `{
		"name": "GoodPlugin", "version": "1.1.0", "title": "好插件",
		"main": "index.html", "logo": "logo.svg",
		"actions": [{"name": "open", "title": "open", "type": "web", "matches": ["good"]}]
	}`)
	write("index.html", "<h1>x</h1>")
	write("logo.svg", "<svg/>")
	write("content.md", "## 插件说明\n\n好插件")
	write("release.md", "## 1.1.0 新增功能\n\n- 新增功能\n\n---\n\n## 1.0.0 初始版本发布\n\n初始")
	write(".faignore", ".DS_Store\n")

	res, err := CheckPluginConfig(dir, true)
	if err != nil {
		t.Fatal(err)
	}
	if !res.Valid {
		t.Fatalf("complete plugin should pass: %v", res.Errors)
	}

	// missing content.md → error
	os.Remove(filepath.Join(dir, "content.md"))
	res, _ = CheckPluginConfig(dir, true)
	if res.Valid {
		t.Fatal("missing content.md should fail")
	}
	write("content.md", "x")

	// release.md version mismatch → error
	write("release.md", "## 0.9.0 旧版本\n\n内容")
	res, _ = CheckPluginConfig(dir, true)
	if res.Valid {
		t.Fatal("release version mismatch should fail")
	}

	// release.md missing --- separators → error
	write("release.md", "## 1.1.0 新增\n\n内容\n\n## 1.0.0 初始\n\n内容")
	res, _ = CheckPluginConfig(dir, true)
	if res.Valid {
		t.Fatal("missing --- separators should fail")
	}
	write("release.md", "## 1.1.0 新增\n\n内容\n\n---\n\n## 1.0.0 初始\n\n内容")

	// bad action type → error
	write("config.json", `{
		"name": "GoodPlugin", "version": "1.1.0", "title": "t",
		"main": "index.html",
		"actions": [{"name": "open", "title": "open", "type": "hack", "matches": ["x"]}]
	}`)
	res, _ = CheckPluginConfig(dir, true)
	if res.Valid {
		t.Fatal("invalid action type should fail")
	}
}
