// Publish fake readings to your broker (useful before ESP32s are online)
import mqtt from "mqtt";

const host = process.env.MQTT_HOST;
const port = Number(process.env.MQTT_PORT || 8883);
const username = process.env.MQTT_USERNAME;
const password = process.env.MQTT_PASSWORD;

if (!host) {
  console.error("Set MQTT_HOST/PORT/USERNAME/PASSWORD envs.");
  process.exit(1);
}

const url = `mqtts://${host}:${port}`;
const client = mqtt.connect(url, { username, password });
client.on("connect", () => {
  console.log("connected, publishing fake data every 5s");
  setInterval(() => {
    const payload = JSON.stringify({
      device_id: "esp32-FAKE",
      sensor_id: "temp-1",
      timestamp: Math.floor(Date.now()/1000),
      temperature_c: 20 + Math.random() * 5
    });
    client.publish("sensors/esp32-FAKE/temperature", payload);
  }, 5000);
});
