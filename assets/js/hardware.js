document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".hardware-card[data-machine]").forEach((card) => {
    const machine = card.dataset.machine;
    const apiBase = card.dataset.apiBase || "";
    const url = `${apiBase}/api/v1/hardware/${machine}/events`;
    const statusEl = card.querySelector(".hardware-status");

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

    function formatSize(gb) {
      if (gb >= 1024) return `${(gb / 1024).toFixed(1)}T`;
      if (gb >= 100) return `${Math.round(gb)}G`;
      return `${gb.toFixed(1)}G`;
    }

    const segmentColors = [
      "var(--color-accent)",
      "var(--color-accent-light)",
      "var(--color-text-muted)",
    ];

    function updateStorage(disks) {
      const row = card.querySelector('[data-stat="storage"]');
      if (!row) return;

      const bar = row.querySelector(".hardware-bar-stacked");
      const value = row.querySelector(".hardware-value");

      const totalGB = disks.reduce((sum, d) => sum + d.totalGB, 0);
      const usedGB = disks.reduce((sum, d) => sum + d.usedGB, 0);
      const pct = totalGB > 0 ? (usedGB / totalGB) * 100 : 0;

      value.innerHTML = `<span class="hardware-value-used">${formatSize(usedGB)}</span>/${formatSize(totalGB)}`;
      bar.setAttribute("aria-valuenow", Math.round(pct));

      bar.innerHTML = "";
      disks.forEach((disk, i) => {
        const segPct = totalGB > 0 ? (disk.usedGB / totalGB) * 100 : 0;
        const seg = document.createElement("div");
        seg.className = "hardware-bar-segment";
        seg.style.width = `${segPct}%`;
        seg.style.background = segmentColors[i % segmentColors.length];
        seg.title = `${disk.mount}: ${formatSize(disk.usedGB)} / ${formatSize(disk.totalGB)}`;
        bar.appendChild(seg);
      });
    }

    function handleMessage(event) {
      const data = JSON.parse(event.data);
      card.removeAttribute("data-state");
      statusEl.textContent = "";

      updateBar("cpu", data.cpu.percent, `${data.cpu.percent.toFixed(1)}%`, null);

      const tempEl = card.querySelector('[data-stat="temp"]');
      if (tempEl) {
        tempEl.textContent = data.cpu.tempC > 0 ? `${data.cpu.tempC}\u00B0C` : "";
      }

      const memUsedGB = (data.memory.usedMB / 1024).toFixed(1);
      const memTotalGB = (data.memory.totalMB / 1024).toFixed(1);
      const memPercent = (data.memory.usedMB / data.memory.totalMB) * 100;
      updateBar("memory", memPercent, `${memUsedGB}G`, `${memTotalGB}G`);

      if (data.disks) {
        updateStorage(data.disks);
      }
    }

    function connect() {
      const es = new EventSource(url);
      es.onmessage = handleMessage;
      es.onerror = () => {
        card.setAttribute("data-state", "offline");
        statusEl.textContent = "Offline";
      };
    }

    connect();
  });
});
