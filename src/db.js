import { InfluxDB, Point, HttpError } from "@influxdata/influxdb-client";

let influx, writeApi, queryApi;
const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;
const historyWindow = process.env.HISTORY_WINDOW || "-7d";

export async function createInflux() {
  if (!url || !token || !org || !bucket) {
    console.error("[influx] Missing env: INFLUX_URL/INFLUX_TOKEN/INFLUX_ORG/INFLUX_BUCKET");
    process.exit(1);
  }
  influx = new InfluxDB({ url, token });
  writeApi = influx.getWriteApi(org, bucket, "ns");
  queryApi = influx.getQueryApi(org);
  console.log("[influx] client ready");
}

export function writeReading({ device_id, sensor_id, temperature_c, timestamp }) {
  const p = new Point("reading")
    .tag("device_id", device_id)
    .tag("sensor_id", sensor_id || "temp-1")
    .floatField("temperature_c", temperature_c);

  // timestamp in seconds or ms; normalize to ns
  let ts = Number(timestamp);
  if (ts < 1e12) ts = ts * 1000; // seconds -> ms
  p.timestamp(ts * 1e6); // ms -> ns

  writeApi.writePoint(p);
}

export async function flushWrites() {
  try { await writeApi.flush(); } catch (e) { /* noop */ }
}

export async function queryLatestPerDevice() {
  const flux = `from(bucket: "${bucket}")
    |> range(start: ${historyWindow})
    |> filter(fn: (r) => r._measurement == "reading")
    |> filter(fn: (r) => r._field == "temperature_c")
    |> group(columns: ["device_id"])
    |> last()`;

  const rows = [];
  await queryApi.collectRows(flux).then(data => {
    data.forEach(r => {
      rows.push({
        device_id: r.device_id,
        sensor_id: r.sensor_id,
        temperature_c: r._value,
        timestamp: new Date(r._time).getTime()
      });
    });
  });
  // Sort by device_id for consistent UI
  rows.sort((a,b) => (a.device_id||"").localeCompare(b.device_id||""));
  return rows;
}

export async function queryHistoryForDevice(deviceId) {
  const flux = `from(bucket: "${bucket}")
    |> range(start: ${historyWindow})
    |> filter(fn: (r) => r._measurement == "reading")
    |> filter(fn: (r) => r._field == "temperature_c")
    |> filter(fn: (r) => r.device_id == "${deviceId}")
    |> keep(columns: ["_time","_value","device_id","sensor_id"])
    |> sort(columns: ["_time"])`;

  const points = [];
  await queryApi.collectRows(flux).then(data => {
    data.forEach(r => {
      points.push({
        t: new Date(r._time).getTime(),
        v: r._value
      });
    });
  });
  return points;
}
