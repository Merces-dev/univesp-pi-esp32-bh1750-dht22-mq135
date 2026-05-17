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
    temperature: "rising" | "falling" | "stable" | null;
    humidity: "rising" | "falling" | "stable" | null;
    lux: "rising" | "falling" | "stable" | null;
    airQuality: "rising" | "falling" | "stable" | null;
  };
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  field: string;
  value: number;
  threshold: number;
  condition: "above" | "below";
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  acknowledged: boolean;
}
