const mqtt = require("mqtt");

const BROKER = process.env.MQTT_BROKER || "localhost";
const PORT = process.env.MQTT_PORT || "1883";
const INTERVAL = parseInt(process.env.INTERVAL_MS || "2000", 10);

const TOPIC_TELEMETRY = "esp32/sensors/telemetry";
const TOPIC_STATUS = "esp32/sensors/status";

/* ── Estado simulado (random walk) ─────────────────────── */
let temperature = 24 + Math.random() * 4;
let humidity = 55 + Math.random() * 10;
let lux = 500;
let airQuality = 150 + Math.random() * 50;
let tick = 0;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function walk(value, step, min, max) {
  return clamp(value + (Math.random() - 0.5) * step, min, max);
}

function heatIndex(t, h) {
  if (t < 25) return +t.toFixed(1);
  // Apparent temperature (Australian BoM)
  const e = (h / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  return +(t + 0.33 * e - 4.0).toFixed(1);
}

function generatePayload() {
  tick++;

  // Ciclo diurno para luminosidade (senoidal ~60 ticks = "1 dia")
  const dayPhase = Math.sin((tick / 60) * Math.PI * 2);
  const baseLux = 5000 + dayPhase * 4500; // 500 – 9500
  lux = clamp(walk(baseLux, 800, 0, 55000), 0, 55000);

  // A cada ~50 ticks, simula um pico de temperatura (para disparar alertas)
  const spike = tick % 50 === 0 ? 8 : 0;
  temperature = walk(temperature + spike * 0.3, 0.6, 15, 42);
  humidity = walk(humidity, 1.5, 20, 95);

  // MQ-135 — qualidade do ar (PPM); picos ocasionais para testar alertas
  const airSpike = tick % 70 === 0 ? 200 : 0;
  airQuality = walk(airQuality + airSpike * 0.3, 15, 50, 900);

  const hi = heatIndex(temperature, humidity);

  return JSON.stringify({
    lux: +lux.toFixed(1),
    temperature: +temperature.toFixed(1),
    humidity: +humidity.toFixed(1),
    heat_index: hi,
    air_quality: +airQuality.toFixed(1),
    interval_ms: INTERVAL,
  });
}

/* ── Conexão MQTT ──────────────────────────────────────── */
const url = `mqtt://${BROKER}:${PORT}`;
console.log(`[mock] Connecting to ${url} (interval ${INTERVAL}ms)...`);

const client = mqtt.connect(url);

client.on("connect", () => {
  console.log("[mock] Connected to MQTT broker");
  client.publish(TOPIC_STATUS, "online", { retain: true });

  setInterval(() => {
    const payload = generatePayload();
    client.publish(TOPIC_TELEMETRY, payload);
    console.log(`[mock] → ${payload}`);
  }, INTERVAL);
});

client.on("error", (err) => {
  console.error(`[mock] MQTT error: ${err.message}`);
});
