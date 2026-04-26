document.addEventListener("DOMContentLoaded", () => {
  // ----- helpers --------------------------------------------------------

  function formatRate(bytesPerSec) {
    let num, unit;
    if (bytesPerSec >= 1073741824) { num = (bytesPerSec / 1073741824).toFixed(1); unit = "GB/s"; }
    else if (bytesPerSec >= 1048576) { num = (bytesPerSec / 1048576).toFixed(1); unit = "MB/s"; }
    else if (bytesPerSec >= 1024) { num = (bytesPerSec / 1024).toFixed(1); unit = "KB/s"; }
    else { num = Math.round(bytesPerSec); unit = "B/s"; }
    return `<strong>${num}</strong> ${unit}`;
  }

  function formatSize(gb) {
    if (gb >= 1024) return `${(gb / 1024).toFixed(1)}T`;
    if (gb >= 100) return `${Math.round(gb)}G`;
    return `${gb.toFixed(1)}G`;
  }

  function formatAge(sec) {
    if (sec == null) return "unknown";
    if (sec < 60) return `${Math.round(sec)}s ago`;
    if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
    const days = Math.floor(sec / 86400);
    return `${days}d ago`;
  }

  const segmentColors = [
    "var(--color-accent)",
    "var(--color-accent-light)",
    "var(--color-text-muted)",
  ];

  // ----- heatmap classification ----------------------------------------

  function serviceClass(svc) {
    if (svc.status === "up") return "is-up";
    if (svc.status === "down") return "is-down";
    return "is-unknown";
  }

  function backupClass(b) {
    if (b.status === "failure") return "is-down";
    if (b.status !== "success") return "is-unknown";
    if (b.ageSec == null) return "is-up";
    if (b.ageSec > 86400 * 2) return "is-stale";    // >2 days = orange
    if (b.ageSec > 86400) return "is-warm";          // >1 day = yellow
    return "is-up";                                   // green
  }

  function healthCells(sh) {
    const cells = [];
    if (sh.zfs) {
      cells.push({
        cls: sh.zfs.allHealthy ? "is-up" : "is-down",
        label: `ZFS ${sh.zfs.pool || ""}: ${sh.zfs.state || "?"}`,
      });
      if (sh.zfs.cacheState) {
        cells.push({
          cls: sh.zfs.cacheState === "ONLINE" ? "is-up" : "is-down",
          label: `L2ARC cache: ${sh.zfs.cacheState}`,
        });
      }
    }
    if (sh.snapraid) {
      const s = sh.snapraid;
      const syncOK = s.lastSyncStatus === "success";
      cells.push({
        cls: syncOK ? "is-up" : "is-down",
        label: `SnapRAID sync: ${s.lastSyncStatus || "unknown"}`,
      });
      const filesOK = s.contentFilesPresent === s.contentFilesExpected;
      cells.push({
        cls: filesOK ? "is-up" : "is-down",
        label: `SnapRAID content files: ${s.contentFilesPresent}/${s.contentFilesExpected}`,
      });
    }
    return cells;
  }

  // ----- rendering ------------------------------------------------------

  function renderHeatmapRow(card, key, cells) {
    const row = card.querySelector(`[data-heatmap="${key}"]`);
    if (!row) return false;
    const cellsContainer = row.querySelector(".hardware-heatmap-cells");
    if (cells.length === 0) {
      row.hidden = true;
      return false;
    }
    row.hidden = false;
    cellsContainer.innerHTML = cells.map((c) =>
      `<span class="hardware-heatmap-cell ${c.cls}" role="listitem" data-tooltip="${escapeHtml(c.label)}" tabindex="0"></span>`
    ).join("");
    return true;
  }

  function renderHardware(card, data) {
    function updateBar(stat, percent, used, total) {
      const row = card.querySelector(`[data-stat="${stat}"]`);
      if (!row) return;
      const bar = row.querySelector(".hardware-bar");
      const fill = row.querySelector(".hardware-bar-fill");
      const value = row.querySelector(".hardware-value");
      fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      bar.setAttribute("aria-valuenow", Math.round(percent));
      if (total) {
        value.innerHTML = `<span class="hardware-value-used">${used}</span>/${total}`;
      } else {
        value.textContent = used;
      }
    }

    updateBar("cpu", data.cpu.percent, `${data.cpu.percent.toFixed(1)}%`, null);

    const tempEl = card.querySelector('[data-stat="temp"]');
    if (tempEl) {
      tempEl.textContent = data.cpu.tempC > 0 ? ` (${data.cpu.tempC}\u00B0C)` : "";
    }

    const memUsedGB = (data.memory.usedMB / 1024).toFixed(1);
    const memTotalGB = (data.memory.totalMB / 1024).toFixed(1);
    const memPercent = (data.memory.usedMB / data.memory.totalMB) * 100;
    updateBar("memory", memPercent, `${memUsedGB}G`, `${memTotalGB}G`);

    if (data.disks) {
      const row = card.querySelector('[data-stat="storage"]');
      if (row) {
        const bar = row.querySelector(".hardware-bar-stacked");
        const value = row.querySelector(".hardware-value");
        const totalGB = data.disks.reduce((s, d) => s + d.totalGB, 0);
        const usedGB = data.disks.reduce((s, d) => s + d.usedGB, 0);
        const pct = totalGB > 0 ? (usedGB / totalGB) * 100 : 0;
        value.innerHTML = `<span class="hardware-value-used">${formatSize(usedGB)}</span>/${formatSize(totalGB)}`;
        bar.setAttribute("aria-valuenow", Math.round(pct));
        bar.innerHTML = "";
        data.disks.forEach((disk, i) => {
          const segPct = totalGB > 0 ? (disk.usedGB / totalGB) * 100 : 0;
          const seg = document.createElement("div");
          seg.className = "hardware-bar-segment";
          seg.style.width = `${segPct}%`;
          seg.style.background = segmentColors[i % segmentColors.length];
          seg.title = `${disk.mount}: ${formatSize(disk.usedGB)} / ${formatSize(disk.totalGB)}`;
          bar.appendChild(seg);
        });
      }
    }

    if (data.network) {
      const rx = card.querySelector(".hardware-net-rx");
      const tx = card.querySelector(".hardware-net-tx");
      if (rx) rx.innerHTML = `rx ${formatRate(data.network.rxBytesPerSec)}`;
      if (tx) tx.innerHTML = `tx ${formatRate(data.network.txBytesPerSec)}`;
    }

    // Heatmaps
    const wrap = card.querySelector(".hardware-heatmaps");
    if (!wrap) return;

    const services = (data.services || []).map((svc) => ({
      cls: serviceClass(svc),
      label: `${svc.name}: ${svc.status}`,
    }));

    const backups = (data.backups || []).map((b) => ({
      cls: backupClass(b),
      label: `${b.name}: ${b.status} (${formatAge(b.ageSec)})`,
    }));

    const health = data.storageHealth ? healthCells(data.storageHealth) : [];

    const anyShown =
      renderHeatmapRow(card, "services", services) |
      renderHeatmapRow(card, "backups", backups) |
      renderHeatmapRow(card, "health", health);
    wrap.hidden = !anyShown;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  // ----- shared connection per machine ----------------------------------

  const channels = new Map();

  function ensureChannel(machine, apiBase) {
    if (channels.has(machine)) return channels.get(machine);
    const url = `${apiBase}/api/v1/hardware/${machine}/events`;
    const channel = { url, listeners: [], state: null };
    const es = new EventSource(url);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      channel.state = data;
      channel.listeners.forEach((fn) => fn(data, "connected"));
    };
    es.onerror = () => {
      channel.listeners.forEach((fn) => fn(null, "offline"));
    };
    channels.set(machine, channel);
    return channel;
  }

  // ----- attach cards ---------------------------------------------------

  document.querySelectorAll(".hardware-card[data-machine]").forEach((card) => {
    const machine = card.dataset.machine;
    const apiBase = card.dataset.apiBase || "";
    const channel = ensureChannel(machine, apiBase);

    const handler = (data, status) => {
      card.setAttribute("data-state", status);
      if (data) renderHardware(card, data);
    };
    channel.listeners.push(handler);
    if (channel.state) handler(channel.state, "connected");
  });
});
