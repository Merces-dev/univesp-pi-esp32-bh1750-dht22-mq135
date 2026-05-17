import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit() {
    const broker = process.env.MQTT_BROKER ?? 'localhost';
    const port = process.env.MQTT_PORT ?? '1883';
    const url = `mqtt://${broker}:${port}`;

    this.logger.log(`Connecting to MQTT broker at ${url}...`);
    this.client = mqtt.connect(url);

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
      this.client.subscribe('esp32/sensors/telemetry');
      this.client.subscribe('esp32/sensors/status');
    });

    this.client.on('message', (topic, payload) => {
      const raw = payload.toString();
      if (topic === 'esp32/sensors/telemetry') {
        try {
          const data = JSON.parse(raw);
          this.eventEmitter.emit('telemetry.raw', data);
        } catch {
          this.logger.warn(`Invalid JSON on telemetry topic: ${raw}`);
        }
      } else if (topic === 'esp32/sensors/status') {
        this.eventEmitter.emit('device.status', raw);
      }
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.client?.end();
  }

  publish(topic: string, message: string): void {
    if (this.client?.connected) {
      this.client.publish(topic, message);
    }
  }
}
