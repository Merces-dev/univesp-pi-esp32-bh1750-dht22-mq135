# ESP32 · BH1750 Light Sensor Logger

Firmware para o módulo **4D Systems GEN4-ESP32-S3R8N16** que lê luminosidade via sensor **BH1750** (I2C) e imprime os valores no monitor serial.

---

## Hardware

### Board

| Campo      | Valor                                      |
| ---------- | ------------------------------------------ |
| Módulo     | 4D Systems GEN4-ESP32 16MB (ESP32S3-R8N16) |
| MCU        | ESP32-S3                                   |
| Flash      | 16 MB (QIO)                                |
| PSRAM      | 8 MB (OPI)                                 |
| USB Serial | UART via CH340/CP210x — **COM8**           |

### Sensor BH1750

| Pino BH1750 | GPIO ESP32-S3 | Observação                |
| ----------- | ------------- | ------------------------- |
| VCC         | 3.3 V         | **Não usar 5 V**          |
| GND         | GND           |                           |
| SCL         | GPIO 18       | Pull-up 4.7 kΩ para 3.3 V |
| SDA         | GPIO 17       | Pull-up 4.7 kΩ para 3.3 V |
| ADDR        | GND           | Endereço I2C: `0x23`      |

> Se o pino **ADDR** estiver ligado ao **VCC**, o endereço passa a ser `0x5C`. O firmware tenta os dois automaticamente.

---

## Dependências

| Biblioteca | Versão   | Fonte                                           |
| ---------- | -------- | ----------------------------------------------- |
| BH1750     | `^1.3.0` | [claws/BH1750](https://github.com/claws/BH1750) |

Gerenciadas automaticamente pelo PlatformIO via `platformio.ini`.

---

## Configuração (`platformio.ini`)

```ini
[env:4d_systems_esp32s3_gen4_r8n16]
platform           = espressif32@6.5.0
board              = 4d_systems_esp32s3_gen4_r8n16
framework          = arduino
upload_port        = COM8
monitor_port       = COM8
monitor_speed      = 115200
monitor_rts        = 0
monitor_dtr        = 0
build_flags =
    -DCORE_DEBUG_LEVEL=5
    -DARDUINO_RUNNING_CORE=1
    -DBOARD_HAS_PSRAM
    -DARDUINO_USB_CDC_ON_BOOT=0   ; redireciona Serial para UART (COM8)
lib_deps =
    claws/BH1750@^1.3.0
```

> **`ARDUINO_USB_CDC_ON_BOOT=0`** é obrigatório neste board para que o `Serial` saia pela UART (COM8) em vez da USB CDC.

---

## Build & Upload

```bash
# Build
pio run

# Upload
pio run --target upload

# Monitor serial
pio device monitor
```

Ou use os botões **Build / Upload / Monitor** da extensão PlatformIO no VS Code.

---

## Saída esperada no monitor serial

```
╔══════════════════════════════════╗
║  ESP32 · BH1750 · WiFi Logger    ║
╚══════════════════════════════════╝
[INFO ] [SETUP] Iniciando I2C — SDA=17 SCL=18
[INFO ] [I2C] Iniciando scan...
[INFO ] [I2C] Dispositivo encontrado: 0x23
[INFO ] [I2C] Scan concluído — 1 dispositivo(s)
[INFO ] [BH1750] Sensor iniciado em 0x23 — modo CONTINUOUS_HIGH_RES
[INFO ] [SETUP] Inicialização concluída.
[INFO ] [BH1750] Luminosidade: 312.5 lx
[INFO ] [BH1750] Luminosidade: 314.2 lx
```

---

## Solução de problemas

| Sintoma                                     | Causa provável                                | Solução                                                     |
| ------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Monitor não exibe nada após `psramInit`     | `ARDUINO_USB_CDC_ON_BOOT=1` (padrão do board) | Garantir `ARDUINO_USB_CDC_ON_BOOT=0` no `build_flags`       |
| `Nenhum dispositivo encontrado` no scan I2C | Fiação incorreta ou pull-ups ausentes         | Verificar SDA=17, SCL=18, VCC=3.3 V e resistores de pull-up |
| `NACK on transmit of address`               | Sensor não alimentado ou endereço errado      | Checar ADDR pin (GND → 0x23, VCC → 0x5C)                    |
| Erro `MissingPackageManifestError` no build | Cache do PlatformIO corrompido                | Apagar `.pio/libdeps` e fazer build novamente               |

---

## Estrutura do projeto

```
├── platformio.ini       # Configuração do PlatformIO
├── src/
│   └── main.cpp         # Firmware principal
├── include/
│   └── README
├── lib/
│   └── README
└── test/
    └── README
```
