#include <Arduino.h>
#include <Wire.h>
#include <BH1750.h>
#include <DHT.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "secrets.h"

// ─── Pinos I2C ─────────────────────────────────────────────────────────────────────────
// Pinos padrão do board 4d_systems_esp32s3_gen4_r8n16 (variante esp32_s3r8n16)
#define I2C_SDA 17
#define I2C_SCL 18

// ─── DHT22 ─────────────────────────────────────────────────────────────────────────────
#define DHT_PIN   4
#define DHT_TYPE  DHT22

// ─── Tópicos MQTT ───────────────────────────────────────────────────────────────────
#define TOPIC_TELEMETRY "esp32/sensors/telemetry"   // publica todas as leituras em um único JSON
#define TOPIC_STATUS    "esp32/sensors/status"      // online / offline (retained)
#define TOPIC_INTERVAL  "esp32/sensors/set/interval" // recebe novo intervalo em ms

// ─── Intervalo de report ──────────────────────────────────────────────────────────────────
#define INTERVAL_DEFAULT_MS  2000
#define INTERVAL_MIN_MS       500
#define INTERVAL_MAX_MS     60000

// ─── Globais ───────────────────────────────────────────────────────────────────────────
BH1750       lightMeter;
DHT          dht(DHT_PIN, DHT_TYPE);
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

static uint32_t reportIntervalMs = INTERVAL_DEFAULT_MS;
static bool     bh1750Ok         = false;
static bool     dhtOk            = false;

// ─── Helpers de log ──────────────────────────────────────────────────────────────────
static void logInfo (const char* tag, const String& msg) { Serial.printf("[INFO ] [%s] %s\n", tag, msg.c_str()); }
static void logWarn (const char* tag, const String& msg) { Serial.printf("[WARN ] [%s] %s\n", tag, msg.c_str()); }
static void logError(const char* tag, const String& msg) { Serial.printf("[ERROR] [%s] %s\n", tag, msg.c_str()); }

// ─── MQTT callback ───────────────────────────────────────────────────────────────────
static void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String value;
    for (unsigned int i = 0; i < length; i++) value += (char)payload[i];

    if (String(topic) == TOPIC_INTERVAL) {
        long ms = value.toInt();
        if (ms < INTERVAL_MIN_MS || ms > INTERVAL_MAX_MS) {
            logWarn("MQTT", "Intervalo inválido: " + value +
                " ms (min=" + INTERVAL_MIN_MS + " max=" + INTERVAL_MAX_MS + ")");
            return;
        }
        reportIntervalMs = (uint32_t)ms;
        logInfo("MQTT", "Intervalo atualizado: " + String(reportIntervalMs) + " ms");
    }
}

// ─── WiFi ────────────────────────────────────────────────────────────────────────────
static void wifiScan() {
    logInfo("WiFi", "Escaneando redes disponíveis...");
    int n = WiFi.scanNetworks();
    if (n == 0) { logWarn("WiFi", "Nenhuma rede encontrada."); }
    else {
        for (int i = 0; i < n; i++) {
            Serial.printf("[INFO ] [WiFi] %2d) %-32s  %d dBm  %s\n",
                i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i),
                WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "aberta" : "segura");
        }
    }
    WiFi.scanDelete();
}

static void initWiFi() {
    wifiScan();
    logInfo("WiFi", "Conectando a: " + String(WIFI_SSID));
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    uint32_t t0 = millis();
    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - t0 > 15000) { logError("WiFi", "Timeout."); return; }
        delay(500); Serial.print(".");
    }
    Serial.println();
    logInfo("WiFi", "Conectado! IP: " + WiFi.localIP().toString());
    logInfo("WiFi", "RSSI: " + String(WiFi.RSSI()) + " dBm");
}

// ─── MQTT ────────────────────────────────────────────────────────────────────────────
static bool mqttConnect() {
    if (WiFi.status() != WL_CONNECTED) return false;
    logInfo("MQTT", "Conectando a " + String(MQTT_BROKER) + ":" + String(MQTT_PORT) + "...");

    bool ok = (strlen(MQTT_USER) > 0)
        ? mqtt.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS_, TOPIC_STATUS, 0, true, "offline")
        : mqtt.connect(MQTT_CLIENT, nullptr, nullptr,      TOPIC_STATUS, 0, true, "offline");

    if (!ok) { logError("MQTT", "Falha (rc=" + String(mqtt.state()) + ")."); return false; }

    mqtt.publish(TOPIC_STATUS, "online", true);
    mqtt.subscribe(TOPIC_INTERVAL);
    logInfo("MQTT", "Conectado! Subscrito em " TOPIC_INTERVAL);
    return true;
}

static void mqttLoop() {
    if (!mqtt.connected()) {
        static uint32_t lastRetry = 0;
        if (millis() - lastRetry > 5000) { lastRetry = millis(); mqttConnect(); }
    }
    mqtt.loop();
}

// ─── I2C Scan ──────────────────────────────────────────────────────────────────────────
static void i2cScan() {
    logInfo("I2C", "Iniciando scan...");
    uint8_t found = 0;
    for (uint8_t addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            Serial.printf("[INFO ] [I2C] Dispositivo: 0x%02X\n", addr);
            found++;
        }
    }
    if (found == 0) logWarn("I2C", "Nenhum dispositivo encontrado!");
    logInfo("I2C", "Scan concluído — " + String(found) + " dispositivo(s)");
}

// ─── DHT22 ───────────────────────────────────────────────────────────────────────────
static bool initDHT() {
    dht.begin();
    delay(2000); // DHT22 precisa de ~2s para a primeira leitura estável
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (isnan(t) || isnan(h)) {
        logError("DHT22", "Sensor não respondeu na inicialização (pino " + String(DHT_PIN) + ").");
        return false;
    }
    logInfo("DHT22", "Iniciado no pino " + String(DHT_PIN) +
        " — T=" + String(t, 1) + "°C  H=" + String(h, 1) + "%");
    return true;
}

// ─── BH1750 ──────────────────────────────────────────────────────────────────────────
static bool initBH1750() {
    Wire.begin(I2C_SDA, I2C_SCL);
    delay(100);
    i2cScan();
    if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire)) {
        logError("BH1750", "0x23 falhou, tentando 0x5C...");
        if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x5C, &Wire)) {
            logError("BH1750", "Sensor não encontrado.");
            return false;
        }
        logInfo("BH1750", "Iniciado em 0x5C");
        return true;
    }
    logInfo("BH1750", "Iniciado em 0x23");
    return true;
}

// ─── Setup ──────────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    uint32_t t0 = millis();
    while (!Serial && (millis() - t0) < 3000) { delay(10); }
    delay(200);

    Serial.println();
    Serial.println("╔══════════════════════════════════╗");
    Serial.println("║  ESP32 · BH1750 · MQTT Logger   ║");
    Serial.println("╚══════════════════════════════════╝");
    Serial.flush();

    initWiFi();

    mqtt.setServer(MQTT_BROKER, MQTT_PORT);
    mqtt.setCallback(mqttCallback);
    mqttConnect();

    logInfo("SETUP", "Iniciando I2C — SDA=" + String(I2C_SDA) + " SCL=" + String(I2C_SCL));
    bh1750Ok = initBH1750();
    if (!bh1750Ok) logWarn("SETUP", "Sistema iniciado SEM sensor BH1750.");

    logInfo("SETUP", "Iniciando DHT22 no pino " + String(DHT_PIN) + "...");
    dhtOk = initDHT();
    if (!dhtOk) logWarn("SETUP", "Sistema iniciado SEM sensor DHT22.");

    logInfo("SETUP", "Intervalo de report: " + String(reportIntervalMs) + " ms");
    logInfo("SETUP", "Inicialização concluída.");
}

// ─── Loop ──────────────────────────────────────────────────────────────────────────
void loop() {
    mqttLoop();

    static uint32_t lastRead = 0;
    if (millis() - lastRead < reportIntervalMs) return;
    lastRead = millis();

    // ─── BH1750 ─────────────────────────────────────────────────────────────────
    float lux = NAN;
    if (bh1750Ok) {
        lux = lightMeter.readLightLevel();
        if (lux < 0) {
            logError("BH1750", "Falha na leitura.");
            lux = NAN;
        } else {
            logInfo("BH1750", "Luminosidade: " + String(lux, 1) + " lx");
        }
    } else {
        logWarn("BH1750", "Sensor não disponível.");
    }

    // ─── DHT22 ──────────────────────────────────────────────────────────────────
    float t = NAN, h = NAN, hic = NAN;
    if (dhtOk) {
        t = dht.readTemperature();
        h = dht.readHumidity();
        if (isnan(t) || isnan(h)) {
            logError("DHT22", "Falha na leitura.");
            t = h = hic = NAN;
        } else {
            hic = dht.computeHeatIndex(t, h, false);
            logInfo("DHT22", "T=" + String(t, 1) + "°C  H=" + String(h, 1) +
                "%  HI=" + String(hic, 1) + "°C");
        }
    } else {
        logWarn("DHT22", "Sensor não disponível.");
    }

    // ─── Monta payload único ────────────────────────────────────────────────────
    char payload[192];
    int n = snprintf(payload, sizeof(payload), "{");
    if (!isnan(lux)) n += snprintf(payload + n, sizeof(payload) - n, "\"lux\":%.1f,", lux);
    else             n += snprintf(payload + n, sizeof(payload) - n, "\"lux\":null,");
    if (!isnan(t))   n += snprintf(payload + n, sizeof(payload) - n, "\"temperature\":%.1f,", t);
    else             n += snprintf(payload + n, sizeof(payload) - n, "\"temperature\":null,");
    if (!isnan(h))   n += snprintf(payload + n, sizeof(payload) - n, "\"humidity\":%.1f,", h);
    else             n += snprintf(payload + n, sizeof(payload) - n, "\"humidity\":null,");
    if (!isnan(hic)) n += snprintf(payload + n, sizeof(payload) - n, "\"heat_index\":%.1f,", hic);
    else             n += snprintf(payload + n, sizeof(payload) - n, "\"heat_index\":null,");
    snprintf(payload + n, sizeof(payload) - n, "\"interval_ms\":%lu}", reportIntervalMs);

    if (mqtt.connected()) {
        mqtt.publish(TOPIC_TELEMETRY, payload);
        logInfo("MQTT", "Publicado [" TOPIC_TELEMETRY "]: " + String(payload));
    } else {
        logWarn("MQTT", "Desconectado — telemetria não publicada.");
    }
}
