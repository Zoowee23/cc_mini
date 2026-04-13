/* ── SOC Dashboard App ── */

const API = "";  // same origin — backend serves frontend
const REFRESH_MS = 30_000;

let barChart = null;
let pieChart = null;

// ── Chart defaults ──────────────────────────────────────────────────────────
Chart.defaults.color = "#5a7a9a";
Chart.defaults.borderColor = "#1a3a5c";
Chart.defaults.font.family = "'Courier New', monospace";

// ── Utility ─────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `API error on ${path}`);
  return json.data;
}

function showError(msg) {
  const banner = document.getElementById("errorBanner");
  document.getElementById("errorMsg").textContent = msg;
  banner.classList.add("visible");
  setTimeout(() => banner.classList.remove("visible"), 8000);
}

function setLastUpdated() {
  document.getElementById("lastUpdated").textContent =
    "Updated: " + new Date().toLocaleTimeString();
}

function fmt(n) {
  return Number(n).toLocaleString();
}

// ── Stats ────────────────────────────────────────────────────────────────────
async function loadStats(threatCount) {
  try {
    const d = await apiFetch("/api/stats");
    animateCount("statTotal", d.totalEvents);
    animateCount("statIPs", d.uniqueIPs);
    document.getElementById("statTopEvent").textContent = d.topEvent || "N/A";
  } catch (e) {
    showError("Stats: " + e.message);
  }
  // threat count comes from threats endpoint
  if (threatCount !== undefined) {
    animateCount("statThreats", threatCount);
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent.replace(/,/g, "")) || 0;
  const diff = target - start;
  const steps = 20;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = fmt(Math.round(start + (diff * step) / steps));
    if (step >= steps) clearInterval(timer);
  }, 30);
}

// ── Bar Chart (Top IPs) ──────────────────────────────────────────────────────
async function loadBarChart() {
  try {
    const data = await apiFetch("/api/top-ips");
    const labels = data.map((r) => r.sourceIPAddress || "unknown");
    const counts = data.map((r) => parseInt(r.count, 10));

    const ctx = document.getElementById("barChart").getContext("2d");

    if (barChart) {
      barChart.data.labels = labels;
      barChart.data.datasets[0].data = counts;
      barChart.update("active");
      return;
    }

    barChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Requests",
          data: counts,
          backgroundColor: counts.map((c) =>
            c > 10 ? "rgba(255,45,85,0.7)" :
            c > 5  ? "rgba(255,140,0,0.7)" :
                     "rgba(0,212,255,0.7)"
          ),
          borderColor: counts.map((c) =>
            c > 10 ? "#ff2d55" : c > 5 ? "#ff8c00" : "#00d4ff"
          ),
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0a1628",
            borderColor: "#1a3a5c",
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            ticks: { maxRotation: 30, font: { size: 10 } },
            grid: { color: "rgba(26,58,92,0.4)" },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(26,58,92,0.4)" },
          },
        },
      },
    });
  } catch (e) {
    showError("Top IPs chart: " + e.message);
  }
}

// ── Pie Chart (Event Distribution) ──────────────────────────────────────────
async function loadPieChart() {
  try {
    // Derive event distribution from logs
    const logs = await apiFetch("/api/logs");
    const counts = {};
    logs.forEach((r) => {
      const name = r.eventName || "Unknown";
      counts[name] = (counts[name] || 0) + 1;
    });

    // Top 8 events + "Other"
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8);
    const otherCount = sorted.slice(8).reduce((s, [, v]) => s + v, 0);
    if (otherCount > 0) top.push(["Other", otherCount]);

    const labels = top.map(([k]) => k);
    const values = top.map(([, v]) => v);

    const palette = [
      "#00d4ff","#00ff88","#ff2d55","#ffd700","#ff8c00",
      "#a855f7","#06b6d4","#f43f5e","#6b7280",
    ];

    const ctx = document.getElementById("pieChart").getContext("2d");

    if (pieChart) {
      pieChart.data.labels = labels;
      pieChart.data.datasets[0].data = values;
      pieChart.update("active");
      return;
    }

    pieChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: palette.map((c) => c + "cc"),
          borderColor: palette,
          borderWidth: 1,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { font: { size: 10 }, padding: 10, boxWidth: 12 },
          },
          tooltip: {
            backgroundColor: "#0a1628",
            borderColor: "#1a3a5c",
            borderWidth: 1,
          },
        },
      },
    });
  } catch (e) {
    showError("Event chart: " + e.message);
  }
}

// ── Logs Table ───────────────────────────────────────────────────────────────
async function loadLogs() {
  try {
    const data = await apiFetch("/api/logs");
    const tbody = document.getElementById("logsTableBody");

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state">No logs found</div></td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((r) => {
      const event = r.eventName || "—";
      const ip    = r.sourceIPAddress || "—";
      const ts    = r.eventTime || "—";
      return `
        <tr class="fade-in">
          <td class="event-name">${escHtml(event)}</td>
          <td class="ip-addr">${escHtml(ip)}</td>
          <td class="timestamp">${escHtml(ts)}</td>
        </tr>`;
    }).join("");
  } catch (e) {
    showError("Logs: " + e.message);
  }
}

// ── Threat Panel ─────────────────────────────────────────────────────────────
async function loadThreats() {
  try {
    const data = await apiFetch("/api/threats");
    const list = document.getElementById("threatList");
    const badge = document.getElementById("threatBadge");

    badge.textContent = `${data.length} THREAT${data.length !== 1 ? "S" : ""}`;

    if (!data.length) {
      list.innerHTML = `<div class="empty-state" style="color:#00ff88">✓ No active threats detected</div>`;
      return;
    }

    list.innerHTML = data.map((r) => {
      const ip       = r.sourceIPAddress || "—";
      const attempts = r.attempts || "—";
      const sev      = r.severity || "LOW";
      return `
        <div class="threat-item ${sev} fade-in">
          <span class="threat-ip">${escHtml(ip)}</span>
          <div class="threat-meta">
            <span class="threat-count">${escHtml(String(attempts))} attempts</span>
            <span class="severity-badge ${sev}">${sev}</span>
          </div>
        </div>`;
    }).join("");

    return data.length;
  } catch (e) {
    showError("Threats: " + e.message);
    return 0;
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Full Refresh ─────────────────────────────────────────────────────────────
async function refresh() {
  const [threatCount] = await Promise.all([
    loadThreats(),
    loadLogs(),
    loadBarChart(),
    loadPieChart(),
  ]);
  await loadStats(threatCount);
  setLastUpdated();
}

// ── Boot ─────────────────────────────────────────────────────────────────────
refresh();
setInterval(refresh, REFRESH_MS);
