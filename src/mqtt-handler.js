import mqtt from "mqtt";
import { writeReading, flushWrites } from "./db.js";

const host = process.env.MQTT_HOST;
const port = Number(process.env.MQTT_PORT || 8883);
const username = process.env.MQTT_USERNAME;
const password = process.env.MQTT_PASSWORD;
const topicFilter = process.env.MQTT_TOPIC_FILTER || "sensors/+/temperature";

let client;

export async function startMqtt() {
  if (!host || !username || !password) {
    console.error("[mqtt] Missing env: MQTT_HOST/USERNAME/PASSWORD");
    process.exit(1);
  }
  const url = `mqtts://${host}:${port}`;
  client = mqtt.connect(url, {
    username,
    password,
    reconnectPeriod: 3000,
    // For managed brokers with valid certs, this is sufficient.
  });

  client.on("connect", () => {
    console.log("[mqtt] connected");
    client.subscribe(topicFilter, (err) => {
      if (err) console.error("[mqtt] subscribe error", err);
      else console.log("[mqtt] subscribed", topicFilter);
    });
  });

  client.on("message", async (topic, payload) => {
  try {
    const msg = JSON.parse(payload.toString());
    if (typeof msg.temperature_c !== "number" || !msg.device_id) return;

    // If timestamp missing/way too old/way in future, use server time
    const nowSec = Math.floor(Date.now() / 1000);
    const yearSec = 365 * 24 * 3600;
    if (!msg.timestamp || msg.timestamp < nowSec - yearSec || msg.timestamp > nowSec + 24 * 3600) {
      msg.timestamp = nowSec;
    }

    writeReading(msg);
  } catch (e) {
    console.error("[mqtt] parse error", e.message);
  }
});


  client.on("error", (e) => console.error("[mqtt] error", e.message));
  client.on("reconnect", () => console.log("[mqtt] reconnecting..."));

  // Periodic flush
  setInterval(() => { flushWrites(); }, 2000);
}
