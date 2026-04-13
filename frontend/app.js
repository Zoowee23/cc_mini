/* ── SOC Dashboard App ── */

const API = "";
const REFRESH_MS = 30_000;

// ── Session ──────────────────────────────────────────────────────────────────
const session = JSON.parse(localStorage.getItem('soc_session') || 'null');
if (session) {
  const initials = session.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent = session.name;
}
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('soc_session');
  window.location.href = 'login.html';
});

let barChart = null, pieChart = null, timelineChart = null,
    sourceChart = null, threatPieChart = null, threatBarChart = null;

// ── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Chart defaults ───────────────────────────────────────────────────────────
Chart.defaults.color = "#5a7a9a";
Chart.defaults.borderColor = "#1a3a5c";
Chart.defaults.font.family = "'Courier New', monospace";

const PALETTE = ["#00d4ff","#00ff88","#ff2d55","#ffd700","#ff8c00","#a855f7","#06b6d4","#f43f5e","#6b7280"];

// ── Utility ──────────────────────────────────────────────────────────────────
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

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent.replace(/,/g, "")) || 0;
  const diff = target - start;
  const steps = 20;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = (Math.round(start + (diff * step) / steps)).toLocaleString();
    if (step >= steps) clearInterval(timer);
  }, 30);
}

function escHtml(str) {
  return String(str ?? "—")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const tooltipDefaults = {
  backgroundColor: "#0a1628",
  borderColor: "#1a3a5c",
  borderWidth: 1,
};

// ── Stats ────────────────────────────────────────────────────────────────────
async function loadStats(threatCount) {
  try {
    const d = await apiFetch("/api/stats");
    animateCount("statTotal", d.totalEvents);
    animateCount("statIPs", d.uniqueIPs);
    document.getElementById("statTopEvent").textContent = d.topEvent || "N/A";
  } catch (e) { showError("Stats: " + e.message); }
  if (threatCount !== undefined) animateCount("statThreats", threatCount);
}

// ── Bar Chart: Top IPs ───────────────────────────────────────────────────────
async function loadBarChart() {
  try {
    const data = await apiFetch("/api/top-ips");
    const labels = data.map(r => r.sourceIPAddress || "unknown");
    const counts = data.map(r => parseInt(r.count, 10));
    const colors = counts.map(c => c > 10 ? "rgba(255,45,85,0.75)" : c > 5 ? "rgba(255,140,0,0.75)" : "rgba(0,212,255,0.75)");
    const borders = counts.map(c => c > 10 ? "#ff2d55" : c > 5 ? "#ff8c00" : "#00d4ff");

    const ctx = document.getElementById("barChart").getContext("2d");
    if (barChart) {
      barChart.data.labels = labels;
      barChart.data.datasets[0].data = counts;
      barChart.data.datasets[0].backgroundColor = colors;
      barChart.data.datasets[0].borderColor = borders;
      barChart.update("active"); return;
    }
    barChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ label: "Requests", data: counts, backgroundColor: colors, borderColor: borders, borderWidth: 1, borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: {
          x: { ticks: { maxRotation: 30, font: { size: 10 } }, grid: { color: "rgba(26,58,92,0.4)" } },
          y: { beginAtZero: true, grid: { color: "rgba(26,58,92,0.4)" } },
        },
      },
    });
  } catch (e) { showError("Top IPs: " + e.message); }
}

// ── Pie Chart: Event Distribution ────────────────────────────────────────────
function buildEventCounts(logs) {
  const counts = {};
  logs.forEach(r => {
    const name = r.eventName || "Unknown";
    counts[name] = (counts[name] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 8);
  const other = sorted.slice(8).reduce((s, [, v]) => s + v, 0);
  if (other > 0) top.push(["Other", other]);
  return top;
}

async function loadPieAndTimeline() {
  try {
    const logs = await apiFetch("/api/logs");

    // ── Pie: event distribution
    const top = buildEventCounts(logs);
    const pieLabels = top.map(([k]) => k);
    const pieValues = top.map(([, v]) => v);
    const ctx1 = document.getElementById("pieChart").getContext("2d");
    if (pieChart) {
      pieChart.data.labels = pieLabels;
      pieChart.data.datasets[0].data = pieValues;
      pieChart.update("active");
    } else {
      pieChart = new Chart(ctx1, {
        type: "doughnut",
        data: {
          labels: pieLabels,
          datasets: [{ data: pieValues, backgroundColor: PALETTE.map(c => c + "cc"), borderColor: PALETTE, borderWidth: 1, hoverOffset: 6 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, padding: 10, boxWidth: 12 } }, tooltip: tooltipDefaults },
        },
      });
    }

    // ── Timeline: bucket by 5-minute intervals, sorted chronologically
    const buckets = {};
    logs.forEach(r => {
      if (!r.eventTime) return;
      const d = new Date(r.eventTime);
      // round down to nearest 5 min
      const mins = Math.floor(d.getUTCMinutes() / 5) * 5;
      const key = `${String(d.getUTCHours()).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });

    // Sort keys chronologically
    const sortedKeys = Object.keys(buckets).sort();
    const timeLabels = sortedKeys;
    const timeValues = sortedKeys.map(k => buckets[k]);

    const ctx2 = document.getElementById("timelineChart").getContext("2d");
    if (timelineChart) {
      timelineChart.data.labels = timeLabels;
      timelineChart.data.datasets[0].data = timeValues;
      timelineChart.update("active");
    } else {
      timelineChart = new Chart(ctx2, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [{
            label: "Events",
            data: timeValues,
            borderColor: "#00d4ff",
            backgroundColor: "rgba(0,212,255,0.12)",
            borderWidth: 2,
            pointBackgroundColor: "#00d4ff",
            pointBorderColor: "#00d4ff",
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.4,
            spanGaps: true,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: tooltipDefaults },
          scales: {
            x: { ticks: { font: { size: 10 }, maxRotation: 45 }, grid: { color: "rgba(26,58,92,0.4)" } },
            y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(26,58,92,0.4)" } },
          },
        },
      });
    }

    // ── Source breakdown: by eventSource (derived from eventName suffix)
    const srcCounts = {};
    logs.forEach(r => {
      // e.g. "s3.amazonaws.com" → "S3", derive from known patterns
      const name = r.eventName || "";
      let src = "Other";
      if (/^List|^Get|^Describe/.test(name)) src = "Read";
      else if (/^Create|^Put|^Add|^Attach/.test(name)) src = "Create";
      else if (/^Delete|^Remove|^Detach/.test(name)) src = "Delete";
      else if (/^Start|^Stop|^Run/.test(name)) src = "Execute";
      else if (/^Update|^Modify|^Set/.test(name)) src = "Modify";
      srcCounts[src] = (srcCounts[src] || 0) + 1;
    });
    const srcLabels = Object.keys(srcCounts);
    const srcValues = srcLabels.map(k => srcCounts[k]);
    const srcColors = ["#00d4ff","#00ff88","#ff2d55","#ffd700","#ff8c00","#a855f7"];

    const ctx3 = document.getElementById("sourceChart").getContext("2d");
    if (sourceChart) {
      sourceChart.data.labels = srcLabels;
      sourceChart.data.datasets[0].data = srcValues;
      sourceChart.update("active");
    } else {
      sourceChart = new Chart(ctx3, {
        type: "bar",
        data: {
          labels: srcLabels,
          datasets: [{ label: "Events", data: srcValues, backgroundColor: srcColors.map(c => c + "bb"), borderColor: srcColors, borderWidth: 1, borderRadius: 4 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: tooltipDefaults },
          scales: {
            x: { grid: { color: "rgba(26,58,92,0.4)" } },
            y: { beginAtZero: true, grid: { color: "rgba(26,58,92,0.4)" } },
          },
        },
      });
    }

    // ── Logs table
    const tbody = document.getElementById("logsTableBody");
    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">No logs found</div></td></tr>`;
    } else {
      tbody.innerHTML = logs.map((r, i) => `
        <tr class="fade-in">
          <td class="timestamp" style="width:40px">${i + 1}</td>
          <td class="event-name">${escHtml(r.eventName)}</td>
          <td class="ip-addr">${escHtml(r.sourceIPAddress)}</td>
          <td class="timestamp">${escHtml(r.eventTime)}</td>
        </tr>`).join("");
    }

  } catch (e) { showError("Logs/Charts: " + e.message); }
}

// ── Threats ──────────────────────────────────────────────────────────────────
async function loadThreats() {
  try {
    const data = await apiFetch("/api/threats");
    const badge = document.getElementById("threatBadge");
    badge.textContent = `${data.length} THREAT${data.length !== 1 ? "S" : ""}`;

    // Severity counts
    const high = data.filter(r => r.severity === "HIGH").length;
    const med  = data.filter(r => r.severity === "MEDIUM").length;
    const low  = data.filter(r => r.severity === "LOW").length;
    animateCount("threatHigh", high);
    animateCount("threatMed", med);
    animateCount("threatLow", low);

    // Threat pie
    const ctx1 = document.getElementById("threatPieChart").getContext("2d");
    const tPieData = { labels: ["HIGH", "MEDIUM", "LOW"], datasets: [{ data: [high, med, low], backgroundColor: ["rgba(255,45,85,0.7)","rgba(255,140,0,0.7)","rgba(0,255,136,0.7)"], borderColor: ["#ff2d55","#ff8c00","#00ff88"], borderWidth: 1 }] };
    if (threatPieChart) { threatPieChart.data = tPieData; threatPieChart.update("active"); }
    else {
      threatPieChart = new Chart(ctx1, {
        type: "doughnut", data: tPieData,
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12, boxWidth: 12 } }, tooltip: tooltipDefaults } },
      });
    }

    // Threat bar
    const sorted = [...data].sort((a, b) => parseInt(b.attempts) - parseInt(a.attempts)).slice(0, 10);
    const tBarLabels = sorted.map(r => r.sourceIPAddress || "—");
    const tBarValues = sorted.map(r => parseInt(r.attempts, 10));
    const tBarColors = sorted.map(r => r.severity === "HIGH" ? "rgba(255,45,85,0.75)" : r.severity === "MEDIUM" ? "rgba(255,140,0,0.75)" : "rgba(0,255,136,0.75)");
    const ctx2 = document.getElementById("threatBarChart").getContext("2d");
    if (threatBarChart) {
      threatBarChart.data.labels = tBarLabels;
      threatBarChart.data.datasets[0].data = tBarValues;
      threatBarChart.data.datasets[0].backgroundColor = tBarColors;
      threatBarChart.update("active");
    } else {
      threatBarChart = new Chart(ctx2, {
        type: "bar",
        data: { labels: tBarLabels, datasets: [{ label: "Attempts", data: tBarValues, backgroundColor: tBarColors, borderWidth: 1, borderRadius: 4 }] },
        options: {
          indexAxis: "y",
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: tooltipDefaults },
          scales: {
            x: { beginAtZero: true, grid: { color: "rgba(26,58,92,0.4)" } },
            y: { ticks: { font: { size: 10 } }, grid: { color: "rgba(26,58,92,0.4)" } },
          },
        },
      });
    }

    // Threat list
    const list = document.getElementById("threatList");
    if (!data.length) {
      list.innerHTML = `<div class="empty-state" style="color:#00ff88">✓ No active threats detected</div>`;
    } else {
      list.innerHTML = data.map(r => `
        <div class="threat-item ${r.severity} fade-in">
          <span class="threat-ip">${escHtml(r.sourceIPAddress)}</span>
          <div class="threat-meta">
            <span class="threat-count">${escHtml(String(r.attempts))} attempts</span>
            <span class="severity-badge ${r.severity}">${r.severity}</span>
          </div>
        </div>`).join("");
    }

    return data.length;
  } catch (e) { showError("Threats: " + e.message); return 0; }
}

// ── Full Refresh ─────────────────────────────────────────────────────────────
async function refresh() {
  const [threatCount] = await Promise.all([
    loadThreats(),
    loadPieAndTimeline(),
    loadBarChart(),
  ]);
  await loadStats(threatCount);
  setLastUpdated();
}

refresh();
setInterval(refresh, REFRESH_MS);
