//go:build !windows

package main

import (
	"os/exec"
	"syscall"
)

func startApp(path string, args []string) error {
	cmd := exec.Command(path, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	return cmd.Start()
}
