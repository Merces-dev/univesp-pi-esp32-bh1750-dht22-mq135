export interface RawTelemetry {
  lux: number | null;
  temperature: number | null;
  humidity: number | null;
  heat_index: number | null;
  air_quality: number | null;
  interval_ms: number;
}

export interface ProcessedTelemetry {
  lux: number | null;
  temperature: number | null;
  humidity: number | null;
  heatIndex: number | null;
  airQuality: number | null;
  intervalMs: number;
  timestamp: string;
  movingAvg: {
    temperature: number | null;
    humidity: number | null;
    lux: number | null;
    airQuality: number | null;
  };
  trend: {
    temperature: 'rising' | 'falling' | 'stable' | null;
    humidity: 'rising' | 'falling' | 'stable' | null;
    lux: 'rising' | 'falling' | 'stable' | null;
    airQuality: 'rising' | 'falling' | 'stable' | null;
  };
}

export interface MetricStats {
  current: number | null;
  min: number;
  max: number;
  avg: number;
  movingAvg: number | null;
  trend: 'rising' | 'falling' | 'stable' | null;
}

export interface SensorStats {
  temperature: MetricStats | null;
  humidity: MetricStats | null;
  lux: MetricStats | null;
  heatIndex: MetricStats | null;
  airQuality: MetricStats | null;
  totalReadings: number;
  uptimeSeconds: number;
}
