package main

import "focusany-cli/cmd"

// Version is injected at build time via ldflags: -X main.Version=x.x.x
var Version = "dev"

func main() {
	cmd.Execute(Version)
}
