import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RawTelemetry,
  ProcessedTelemetry,
  SensorStats,
  MetricStats,
} from './interfaces/telemetry.interface';

const MAX_HISTORY = 200;
const MOVING_AVG_WINDOW = 10;
const TREND_WINDOW = 5;

/** Faixas físicas válidas dos sensores */
const VALID_RANGES: Record<string, { min: number; max: number }> = {
  temperature: { min: -40, max: 80 },
  humidity: { min: 0, max: 100 },
  lux: { min: 0, max: 65535 },
  heat_index: { min: -40, max: 80 },
  air_quality: { min: 0, max: 1000 },
};

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);
  private history: ProcessedTelemetry[] = [];
  private deviceStatus = 'offline';
  private readonly startTime = Date.now();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /* ───────── Eventos ───────── */

  @OnEvent('telemetry.raw')
  handleRawTelemetry(raw: RawTelemetry): void {
    const validated = this.validate(raw);
    if (!validated) return;

    const processed = this.process(validated);
    this.history.push(processed);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }

    this.eventEmitter.emit('telemetry.processed', processed);
    this.logger.debug(
      `Processed: T=${processed.temperature}°C  H=${processed.humidity}%  L=${processed.lux}lx`,
    );
  }

  @OnEvent('device.status')
  handleDeviceStatus(status: string): void {
    this.deviceStatus = status;
    this.eventEmitter.emit('device.status.changed', status);
    this.logger.log(`Device status → ${status}`);
  }

  /* ───────── Validação ───────── */

  private validate(raw: RawTelemetry): RawTelemetry | null {
    const validated = { ...raw };

    for (const [key, range] of Object.entries(VALID_RANGES)) {
      const value = (validated as any)[key];
      if (value !== null && typeof value === 'number') {
        if (value < range.min || value > range.max) {
          this.logger.warn(
            `Out-of-range ${key}: ${value} (valid: ${range.min}–${range.max})`,
          );
          (validated as any)[key] = null;
        }
      }
    }

    if (
      validated.lux === null &&
      validated.temperature === null &&
      validated.humidity === null &&
      validated.air_quality === null
    ) {
      this.logger.warn('All sensor values null — discarding reading');
      return null;
    }

    return validated;
  }

  /* ───────── Processamento ───────── */

  private process(raw: RawTelemetry): ProcessedTelemetry {
    const recentTemps = this.recentValues('temperature', MOVING_AVG_WINDOW);
    const recentHumids = this.recentValues('humidity', MOVING_AVG_WINDOW);
    const recentLux = this.recentValues('lux', MOVING_AVG_WINDOW);
    const recentAir = this.recentValues('airQuality', MOVING_AVG_WINDOW);

    return {
      lux: raw.lux,
      temperature: raw.temperature,
      humidity: raw.humidity,
      heatIndex: raw.heat_index,
      airQuality: raw.air_quality,
      intervalMs: raw.interval_ms,
      timestamp: new Date().toISOString(),
      movingAvg: {
        temperature: this.movingAvg(recentTemps, raw.temperature),
        humidity: this.movingAvg(recentHumids, raw.humidity),
        lux: this.movingAvg(recentLux, raw.lux),
        airQuality: this.movingAvg(recentAir, raw.air_quality),
      },
      trend: {
        temperature: this.detectTrend('temperature'),
        humidity: this.detectTrend('humidity'),
        lux: this.detectTrend('lux'),
        airQuality: this.detectTrend('airQuality'),
      },
    };
  }

  private recentValues(field: string, count: number): number[] {
    return this.history
      .slice(-count)
      .map((r) => (r as any)[field])
      .filter((v: any) => v !== null && v !== undefined) as number[];
  }

  private movingAvg(recent: number[], current: number | null): number | null {
    const values = current !== null ? [...recent, current] : recent;
    if (values.length === 0) return null;
    return +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  }

  private detectTrend(
    field: string,
  ): 'rising' | 'falling' | 'stable' | null {
    const values = this.recentValues(field, TREND_WINDOW);
    if (values.length < 3) return null;

    const diffs: number[] = [];
    for (let i = 1; i < values.length; i++) {
      diffs.push(values[i] - values[i - 1]);
    }
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    if (avg > 0.3) return 'rising';
    if (avg < -0.3) return 'falling';
    return 'stable';
  }

  /* ───────── API pública ───────── */

  getCurrent(): ProcessedTelemetry | null {
    return this.history.length > 0
      ? this.history[this.history.length - 1]
      : null;
  }

  getHistory(limit = 50): ProcessedTelemetry[] {
    return this.history.slice(-limit);
  }

  getStats(): SensorStats {
    return {
      temperature: this.metricStats('temperature'),
      humidity: this.metricStats('humidity'),
      lux: this.metricStats('lux'),
      heatIndex: this.metricStats('heatIndex'),
      airQuality: this.metricStats('airQuality'),
      totalReadings: this.history.length,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  getDeviceStatus(): string {
    return this.deviceStatus;
  }

  private metricStats(field: string): MetricStats | null {
    const values = this.history
      .map((r) => (r as any)[field])
      .filter((v: any) => v !== null && v !== undefined) as number[];

    if (values.length === 0) return null;

    const current = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    const recent = values.slice(-MOVING_AVG_WINDOW);
    const movingAvg = +(
      recent.reduce((a, b) => a + b, 0) / recent.length
    ).toFixed(1);

    return {
      current,
      min,
      max,
      avg,
      movingAvg,
      trend: this.detectTrend(field),
    };
  }
}
