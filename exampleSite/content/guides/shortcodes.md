---
title: "Shortcodes"
description: "Custom shortcodes included with moo-theme"
weight: 3
---

## claude

Renders a section in monospace font, visually distinct from the surrounding prose. Originally designed for AI-authored sections in blog posts where a different voice is speaking.

### Usage

```markdown
{{</* claude */>}}
Hi. I'm Claude. I'll be handling this section.

The technical explanation goes here in a different voice.

Back to you, Jack.
{{</* /claude */>}}
```

### Result

{{< claude >}}
Hi. I'm Claude. I'll be handling this section.

The technical explanation goes here in a different voice. You can include `code`, **bold**, *italic*, and all other markdown inside the shortcode.

Back to you, Jack.
{{< /claude >}}

You can use this shortcode for any content that should feel distinct from the main narrative — AI responses, terminal output narratives, guest contributions, or anything that benefits from a visual voice shift.

## hardware

Displays a real-time hardware telemetry card showing CPU, RAM, storage, and network I/O. Data is streamed via Server-Sent Events (SSE) from a backend you provide.

### Usage

```markdown
{{</* hardware "my-server" */>}}
```

Multiple cards can be placed side by side with `hardwaregroup`:

```markdown
{{</* hardwaregroup */>}}
{{</* hardware "server-a" */>}}
{{</* hardware "server-b" */>}}
{{</* /hardwaregroup */>}}
```

### Configuration

The shortcode connects to `/api/v1/hardware/{name}/events` on the same origin by default. To use a different host, set `hardwareApiBase` in your `hugo.toml`:

```toml
[params]
  hardwareApiBase = "https://telemetry.example.com"
```

### Expected SSE format

The backend must serve an SSE stream (`Content-Type: text/event-stream`) at `/api/v1/hardware/{name}/events`. Each message is a JSON object:

```json
{
  "hostname": "my-server",
  "cpu": { "percent": 12.5, "cores": 4, "tempC": 41.0 },
  "memory": { "usedMB": 4096, "totalMB": 8192 },
  "disks": [
    { "mount": "/", "usedGB": 45.2, "totalGB": 76.0 }
  ],
  "network": { "rxBytesPerSec": 51200, "txBytesPerSec": 12800 },
  "uptime": 1234567,
  "timestamp": "2026-04-05T12:00:00Z"
}
```

A health check endpoint at `/api/v1/hardware/{name}/health` returning `{"status":"ok"}` is recommended but not required by the shortcode.

Fields:

- `cpu.tempC` — set to `0` if unavailable; the card hides the temperature display
- `disks` — multiple entries are shown as a stacked bar with hover tooltips per pool
- `network` — displayed as `rx` (receive) and `tx` (transmit) with auto-scaling units

### Example Go backend

A minimal Go service that provides the expected SSE stream. Reads CPU from `/proc/stat`, memory from `/proc/meminfo`, and disk via `syscall.Statfs`. In production you'd add network I/O, temperature, and uptime collectors too.

```go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

type State struct {
	mu        sync.RWMutex
	Hostname  string  `json:"hostname"`
	CPU       CPU     `json:"cpu"`
	Memory    Memory  `json:"memory"`
	Disks     []Disk  `json:"disks"`
	Network   Net     `json:"network"`
	Uptime    int64   `json:"uptime"`
	Timestamp string  `json:"timestamp"`
}

type CPU struct {
	Percent float64 `json:"percent"`
	Cores   int     `json:"cores"`
	TempC   float64 `json:"tempC"`
}

type Memory struct {
	UsedMB  float64 `json:"usedMB"`
	TotalMB float64 `json:"totalMB"`
}

type Disk struct {
	Mount   string  `json:"mount"`
	UsedGB  float64 `json:"usedGB"`
	TotalGB float64 `json:"totalGB"`
}

type Net struct {
	RxBytesPerSec float64 `json:"rxBytesPerSec"`
	TxBytesPerSec float64 `json:"txBytesPerSec"`
}

func (s *State) snapshot() []byte {
	s.mu.RLock()
	s.Timestamp = time.Now().UTC().Format(time.RFC3339)
	data, _ := json.Marshal(s)
	s.mu.RUnlock()
	return data
}

func main() {
	state := &State{Hostname: "my-server"}

	// Start your collectors here — goroutines that periodically
	// read /proc/stat, /proc/meminfo, syscall.Statfs, etc.
	// and update state under state.mu.Lock().

	http.HandleFunc("/events", func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming unsupported", 500)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		fmt.Fprintf(w, "data: %s\n\n", state.snapshot())
		flusher.Flush()

		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				fmt.Fprintf(w, "data: %s\n\n", state.snapshot())
				flusher.Flush()
			case <-r.Context().Done():
				return
			}
		}
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	log.Fatal(http.ListenAndServe(":8097", nil))
}
```

For a production-ready implementation with CPU, memory, disk, temperature, network, and uptime collectors, see [hardware-status](https://github.com/jackbhickey/hugo-moo-theme) in the moo.media lab infrastructure.
