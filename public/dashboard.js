const tbody = document.querySelector("#devices tbody");
const statusEl = document.querySelector("#status");
const refreshBtn = document.querySelector("#refresh");
let chart, chartCtx;

async function fetchDevices() {
  const res = await fetch('/api/devices');
  return res.json();
}
async function fetchHistory(deviceId) {
  const res = await fetch('/api/history/' + encodeURIComponent(deviceId));
  return res.json();
}

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}
function renderTable(devs) {
  tbody.innerHTML = "";
  for (const d of devs) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${d.device_id}</td><td>${d.sensor_id || ""}</td><td>${d.temperature_c?.toFixed(2) ?? ""}</td><td>${fmtTime(d.timestamp)}</td>`;
    tr.addEventListener("click", () => loadChart(d.device_id));
    tbody.appendChild(tr);
  }
}

async function loadChart(deviceId) {
  const points = await fetchHistory(deviceId);
  const labels = points.map(p => new Date(p.t));
  const data = points.map(p => p.v);
  if (!chartCtx) chartCtx = document.getElementById('chart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(chartCtx, {
    type: 'line',
    data: { labels, datasets: [{ label: deviceId + ' (°C)', data }] },
    options: { responsive: true, animation: false, scales: { x: { type: 'time', time: { unit: 'minute' } } } }
  });
}

async function tick() {
  try {
    const devs = await fetchDevices();
    renderTable(devs);
    statusEl.textContent = "Last refresh: " + new Date().toLocaleTimeString();
  } catch (e) {
    statusEl.textContent = "Error: " + e.message;
  }
}

refreshBtn.addEventListener("click", tick);
setInterval(tick, 10000);
tick();
