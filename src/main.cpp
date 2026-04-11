#include <Arduino.h>
#include <Wire.h>
#include <BH1750.h>

// ─── Pinos I2C (BH1750) ───────────────────────────────────────────────────────
// Pinos padrão do board 4d_systems_esp32s3_gen4_r8n16 (esp32_s3r8n16 variant)
#define I2C_SDA 17
#define I2C_SCL 18

// ─── Intervalo de leitura (ms) ───────────────────────────────────────────────
#define READ_INTERVAL_MS 2000

BH1750 lightMeter;

// ─── Helpers de log ──────────────────────────────────────────────────────────
static void logInfo(const char* tag, const String& msg) {
    Serial.printf("[INFO ] [%s] %s\n", tag, msg.c_str());
}

static void logWarn(const char* tag, const String& msg) {
    Serial.printf("[WARN ] [%s] %s\n", tag, msg.c_str());
}

static void logError(const char* tag, const String& msg) {
    Serial.printf("[ERROR] [%s] %s\n", tag, msg.c_str());
}

// ─── I2C Scan ────────────────────────────────────────────────────────────────
static void i2cScan() {
    Serial.println("[INFO ] [I2C] Iniciando scan...");
    uint8_t found = 0;
    for (uint8_t addr = 1; addr < 127; addr++) {
        Wire.beginTransmission(addr);
        uint8_t err = Wire.endTransmission();
        if (err == 0) {
            Serial.printf("[INFO ] [I2C] Dispositivo encontrado: 0x%02X\n", addr);
            found++;
        }
    }
    if (found == 0) {
        Serial.println("[WARN ] [I2C] Nenhum dispositivo encontrado!");
    }
    Serial.printf("[INFO ] [I2C] Scan concluído — %d dispositivo(s)\n", found);
}

// ─── BH1750 ──────────────────────────────────────────────────────────────────
static bool initBH1750() {
    Wire.begin(I2C_SDA, I2C_SCL);
    delay(100);
    i2cScan();

    // BH1750 endereço padrão: 0x23 (ADDR=GND) ou 0x5C (ADDR=VCC)
    if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire)) {
        logError("BH1750", "0x23 falhou, tentando 0x5C...");
        if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x5C, &Wire)) {
            logError("BH1750", "Sensor não encontrado em nenhum endereço.");
            return false;
        }
        logInfo("BH1750", "Sensor iniciado em 0x5C — modo CONTINUOUS_HIGH_RES");
        return true;
    }
    logInfo("BH1750", "Sensor iniciado em 0x23 — modo CONTINUOUS_HIGH_RES");
    return true;
}

// ─── Setup ───────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    // Aguarda Serial ficar pronta (até 3 s) — evita perder logs iniciais
    uint32_t t0 = millis();
    while (!Serial && (millis() - t0) < 3000) { delay(10); }
    delay(200);

    Serial.println();
    Serial.println("╔══════════════════════════════════╗");
    Serial.println("║  ESP32 · BH1750 · WiFi Logger    ║");
    Serial.println("╚══════════════════════════════════╝");
    Serial.flush();

    logInfo("SETUP", "Iniciando I2C — SDA=" + String(I2C_SDA) + " SCL=" + String(I2C_SCL));

    if (!initBH1750()) {
        logWarn("SETUP", "Sistema iniciado SEM sensor BH1750.");
    }

    logInfo("SETUP", "Inicialização concluída.");
}

// ─── Loop ────────────────────────────────────────────────────────────────────
void loop() {
    static uint32_t lastRead = 0;
    const uint32_t now = millis();

    if (now - lastRead >= READ_INTERVAL_MS) {
        lastRead = now;

        // ── Leitura BH1750 ───────────────────────────────────────────────────
        float lux = lightMeter.readLightLevel();
        if (lux < 0) {
            logError("BH1750", "Falha na leitura do sensor.");
        } else {
            logInfo("BH1750", "Luminosidade: " + String(lux, 1) + " lx");
        }

    }
}