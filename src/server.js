import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createInflux, queryLatestPerDevice, queryHistoryForDevice } from "./db.js";
import { startMqtt } from "./mqtt-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = process.env.HTTP_PORT || 4000;

// API routes
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/devices", async (req, res) => {
  try {
    const items = await queryLatestPerDevice();
    res.json(items);
  } catch (e) {
    console.error("devices error", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/history/:deviceId", async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const points = await queryHistoryForDevice(deviceId);
    res.json(points);
  } catch (e) {
    console.error("history error", e);
    res.status(500).json({ error: "server_error" });
  }
});

// start
const server = app.listen(PORT, () => {
  console.log(`[bridge] HTTP listening on :${PORT}`);
});

// init Influx + MQTT
await createInflux();
await startMqtt();
