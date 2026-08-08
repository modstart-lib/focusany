package internal

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// --- .faignore (FocusAny ignore) -------------------------------------------
//
// A line-based ignore list like .gitignore, used when packaging a plugin:
//   - blank lines and lines starting with # are ignored
//   - a rule matches the file's basename OR its slash-normalised relative path
//   - trailing / matches a directory (and everything under it)
//   - * and ? glob wildcards are supported (filepath.Match)
//   - ! prefix re-includes (not supported yet — packaging is additive-safe)
//     — kept deliberately simple; most plugins only need a couple of entries.

// loadIgnoreRules reads a .faignore file and returns normalised rules.
func loadIgnoreRules(root string) ([]string, error) {
	p := filepath.Join(root, ".faignore")
	data, err := os.ReadFile(p)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var rules []string
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		rules = append(rules, strings.TrimPrefix(line, "./"))
	}
	return rules, nil
}

func isIgnored(relPath string, rules []string) bool {
	relPath = filepath.ToSlash(relPath)
	base := filepath.Base(relPath)
	for _, r := range rules {
		r = filepath.ToSlash(strings.TrimPrefix(r, "./"))
		dirRule := strings.HasSuffix(r, "/")
		rule := strings.TrimSuffix(r, "/")
		if dirRule {
			// directory rule: match the dir itself or anything under it
			if relPath == rule || strings.HasPrefix(relPath, rule+"/") {
				return true
			}
			continue
		}
		if ok, _ := filepath.Match(rule, base); ok {
			return true
		}
		if ok, _ := filepath.Match(rule, relPath); ok {
			return true
		}
		if strings.Contains(relPath, rule) {
			// bare name rule matches at any depth
			if rule == base {
				return true
			}
		}
	}
	return false
}

// --- zip packaging ----------------------------------------------------------

// ZipPlugin packages a plugin directory into a zip archive with config.json at
// the archive root (what FocusAny's installer expects). Entries matching
// .faignore are excluded. Returns the output path.
func ZipPlugin(srcDir, outPath string) error {
	absSrc, err := filepath.Abs(srcDir)
	if err != nil {
		return err
	}
	rules, err := loadIgnoreRules(absSrc)
	if err != nil {
		return fmt.Errorf("read .faignore: %w", err)
	}

	out, err := os.Create(outPath)
	if err != nil {
		return err
	}
	defer out.Close()

	zw := zip.NewWriter(out)
	defer zw.Close()

	err = filepath.WalkDir(absSrc, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(absSrc, p)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		relSlash := filepath.ToSlash(rel)
		if isIgnored(rel, rules) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if d.IsDir() {
			return nil
		}
		f, err := os.Open(p)
		if err != nil {
			return err
		}
		defer f.Close()
		info, err := f.Stat()
		if err != nil {
			return err
		}
		hdr, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		hdr.Name = relSlash
		hdr.Method = zip.Deflate
		w, err := zw.CreateHeader(hdr)
		if err != nil {
			return err
		}
		_, err = io.Copy(w, f)
		return err
	})
	if err != nil {
		return fmt.Errorf("walk %s: %w", absSrc, err)
	}
	return nil
}
