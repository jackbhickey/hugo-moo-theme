document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".hardware-card[data-machine]").forEach((card) => {
    const machine = card.dataset.machine;
    const apiBase = card.dataset.apiBase || "";
    const url = `${apiBase}/api/v1/hardware/${machine}/events`;
    const statusEl = card.querySelector(".hardware-status");
    const disksEl = card.querySelector(".hardware-disks");

    function updateBar(stat, percent, text) {
      const row = card.querySelector(`[data-stat="${stat}"]`);
      if (!row) return;
      const bar = row.querySelector(".hardware-bar");
      const fill = row.querySelector(".hardware-bar-fill");
      const value = row.querySelector(".hardware-value");
      fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      bar.setAttribute("aria-valuenow", Math.round(percent));
      value.textContent = text;
    }

    function ensureDiskRow(mount) {
      let row = card.querySelector(`[data-stat="disk-${CSS.escape(mount)}"]`);
      if (row) return row;
      row = document.createElement("div");
      row.className = "hardware-stat";
      row.dataset.stat = `disk-${mount}`;
      row.innerHTML = `
        <span class="hardware-label">${mount}</span>
        <div class="hardware-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Disk usage for ${mount}">
          <div class="hardware-bar-fill"></div>
        </div>
        <span class="hardware-value">—</span>`;
      disksEl.appendChild(row);
      return row;
    }

    function formatSize(gb) {
      if (gb >= 1024) return `${(gb / 1024).toFixed(1)}T`;
      if (gb >= 100) return `${Math.round(gb)}G`;
      return `${gb.toFixed(1)}G`;
    }

    function handleMessage(event) {
      const data = JSON.parse(event.data);
      card.removeAttribute("data-state");
      statusEl.textContent = "";

      updateBar("cpu", data.cpu.percent, `${data.cpu.percent.toFixed(1)}%`);

      const tempEl = card.querySelector('[data-stat="temp"]');
      if (tempEl) {
        tempEl.textContent = data.cpu.tempC > 0 ? `${data.cpu.tempC}°C` : "";
      }

      const memUsedGB = (data.memory.usedMB / 1024).toFixed(1);
      const memTotalGB = (data.memory.totalMB / 1024).toFixed(1);
      const memPercent = (data.memory.usedMB / data.memory.totalMB) * 100;
      updateBar("memory", memPercent, `${memUsedGB}/${memTotalGB}G`);

      if (data.disks) {
        data.disks.forEach((disk) => {
          ensureDiskRow(disk.mount);
          const pct = (disk.usedGB / disk.totalGB) * 100;
          updateBar(
            `disk-${disk.mount}`,
            pct,
            `${formatSize(disk.usedGB)}/${formatSize(disk.totalGB)}`,
          );
        });
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
