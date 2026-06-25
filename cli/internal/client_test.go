package internal

import (
	"bytes"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestPrintJSON(t *testing.T) {
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}

	stdout := os.Stdout
	os.Stdout = w

	input := map[string]string{"key": "value"}
	err = PrintJSON(input)
	if err != nil {
		t.Fatalf("PrintJSON failed: %v", err)
	}

	w.Close()
	os.Stdout = stdout

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Fatal(err)
	}
	r.Close()

	got := strings.TrimSpace(buf.String())
	var result map[string]string
	if err := json.Unmarshal([]byte(got), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, got)
	}
	if result["key"] != "value" {
		t.Fatalf("unexpected JSON content: %+v", result)
	}
}

func TestPrintJSONPrettyPrinted(t *testing.T) {
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}

	stdout := os.Stdout
	os.Stdout = w

	input := map[string]int{"a": 1}
	PrintJSON(input)

	w.Close()
	os.Stdout = stdout

	var buf bytes.Buffer
	io.Copy(&buf, r)
	r.Close()

	got := buf.String()
	// Should have indentation (2 spaces)
	if !strings.Contains(got, "  ") {
		t.Fatalf("expected indented JSON, got: %s", got)
	}
}

func TestDoRequestGET(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			t.Fatalf("expected GET, got %s", r.Method)
		}
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Fatalf("unexpected auth header: %s", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	port := srv.Listener.Addr().(*net.TCPAddr).Port

	cfg := &AuthConfig{Port: port, Token: "test-token"}
	result, err := DoRequest(cfg, "GET", "/api/test", nil)
	if err != nil {
		t.Fatalf("DoRequest failed: %v", err)
	}
	if result["status"] != "ok" {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestDoRequestPOST(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Fatalf("unexpected Content-Type: %s", r.Header.Get("Content-Type"))
		}
		body, _ := io.ReadAll(r.Body)
		var req map[string]string
		if err := json.Unmarshal(body, &req); err != nil {
			t.Fatalf("bad request body: %v", err)
		}
		if req["name"] != "test" {
			t.Fatalf("unexpected body: %+v", req)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"received":true}`))
	}))
	defer srv.Close()

	port := srv.Listener.Addr().(*net.TCPAddr).Port
	cfg := &AuthConfig{Port: port, Token: "test-token"}
	result, err := DoRequest(cfg, "POST", "/api/data", map[string]string{"name": "test"})
	if err != nil {
		t.Fatalf("DoRequest failed: %v", err)
	}
	if result["received"] != true {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestDoRequestUnauthorized(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error":"unauthorized"}`))
	}))
	defer srv.Close()

	port := srv.Listener.Addr().(*net.TCPAddr).Port
	cfg := &AuthConfig{Port: port, Token: "wrong-token"}
	_, err := DoRequest(cfg, "GET", "/api/test", nil)
	if err == nil {
		t.Fatal("expected error for unauthorized, got nil")
	}
	if !strings.Contains(err.Error(), "unauthorized") {
		t.Fatalf("expected unauthorized error, got: %v", err)
	}
}

func TestDoRequestInvalidJSONResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`not-json`))
	}))
	defer srv.Close()

	port := srv.Listener.Addr().(*net.TCPAddr).Port
	cfg := &AuthConfig{Port: port, Token: "test-token"}
	_, err := DoRequest(cfg, "GET", "/api/test", nil)
	if err == nil {
		t.Fatal("expected error for invalid JSON response, got nil")
	}
	if !strings.Contains(err.Error(), "parse response") {
		t.Fatalf("expected parse response error, got: %v", err)
	}
}

func TestDoRequestServerUnavailable(t *testing.T) {
	// Use a port that is unlikely to be in use
	cfg := &AuthConfig{Port: 1, Token: "test-token"}
	_, err := DoRequest(cfg, "GET", "/api/test", nil)
	if err == nil {
		t.Fatal("expected error for unavailable server, got nil")
	}
	if !strings.Contains(err.Error(), "request failed") {
		t.Fatalf("expected request failed error, got: %v", err)
	}
}
