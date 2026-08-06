package ai

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type NLPSidecarManager struct {
	cmd  *exec.Cmd
	port int
}

// StartNLPSidecar launches the Python NLP sidecar script as a sub-process and monitors its port.
func StartNLPSidecar(scriptDir string, port int) (*NLPSidecarManager, error) {
	scriptPath := filepath.Join(scriptDir, "nlp_sidecar", "app.py")
	if _, err := os.Stat(scriptPath); err != nil {
		return nil, fmt.Errorf("sidecar script not found at %s: %w", scriptPath, err)
	}

	cmd := exec.Command("python3", scriptPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start nlp sidecar subprocess: %w", err)
	}

	manager := &NLPSidecarManager{
		cmd:  cmd,
		port: port,
	}

	// Wait up to 3 seconds for sidecar to respond on port
	healthURL := fmt.Sprintf("http://127.0.0.1:%d/analyze", port)
	client := &http.Client{Timeout: 500 * time.Millisecond}
	started := false

	for i := 0; i < 30; i++ {
		time.Sleep(100 * time.Millisecond)
		resp, err := client.Get(healthURL)
		if err == nil {
			resp.Body.Close()
			started = true
			break
		}
	}

	if !started {
		slog.Warn("nlp sidecar sub-process started but did not respond to initial ping", "port", port)
	} else {
		slog.Info("nlp sidecar sub-process started successfully", "port", port, "pid", cmd.Process.Pid)
	}

	return manager, nil
}

// Stop terminates the sub-process cleanly.
func (m *NLPSidecarManager) Stop() {
	if m == nil || m.cmd == nil || m.cmd.Process == nil {
		return
	}
	slog.Info("stopping nlp sidecar sub-process", "pid", m.cmd.Process.Pid)
	_ = m.cmd.Process.Kill()
	_ = m.cmd.Wait()
}
