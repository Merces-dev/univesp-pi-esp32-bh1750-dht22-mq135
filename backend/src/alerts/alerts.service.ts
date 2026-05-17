import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AlertRule, TriggeredAlert } from "./interfaces/alert.interface";
import { ProcessedTelemetry } from "../sensors/interfaces/telemetry.interface";

const ALERT_COOLDOWN_MS = 30_000;

const DEFAULT_RULES: AlertRule[] = [
  {
    id: "temp-critical-high",
    name: "Temperatura Crítica",
    field: "temperature",
    condition: "above",
    threshold: 35,
    severity: "critical",
    message: "Temperatura ultrapassou 35°C — risco de superaquecimento",
    enabled: true,
  },
  {
    id: "temp-warning-high",
    name: "Temperatura Elevada",
    field: "temperature",
    condition: "above",
    threshold: 30,
    severity: "warning",
    message: "Temperatura acima de 30°C",
    enabled: true,
  },
  {
    id: "temp-warning-low",
    name: "Temperatura Baixa",
    field: "temperature",
    condition: "below",
    threshold: 10,
    severity: "warning",
    message: "Temperatura abaixo de 10°C",
    enabled: true,
  },
  {
    id: "humidity-high",
    name: "Umidade Elevada",
    field: "humidity",
    condition: "above",
    threshold: 80,
    severity: "warning",
    message: "Umidade relativa acima de 80%",
    enabled: true,
  },
  {
    id: "humidity-low",
    name: "Umidade Baixa",
    field: "humidity",
    condition: "below",
    threshold: 30,
    severity: "warning",
    message: "Umidade relativa abaixo de 30%",
    enabled: true,
  },
  {
    id: "lux-high",
    name: "Luminosidade Alta",
    field: "lux",
    condition: "above",
    threshold: 10000,
    severity: "warning",
    message: "Luminosidade acima de 10.000 lux — exposição solar direta",
    enabled: true,
  },
  {
    id: "lux-low",
    name: "Ambiente Escuro",
    field: "lux",
    condition: "below",
    threshold: 10,
    severity: "info",
    message: "Luminosidade abaixo de 10 lux — ambiente escuro",
    enabled: true,
  },
  {
    id: "heat-index-critical",
    name: "Índice de Calor Perigoso",
    field: "heatIndex",
    condition: "above",
    threshold: 40,
    severity: "critical",
    message: "Índice de calor ultrapassou 40°C — condições perigosas",
    enabled: true,
  },
  {
    id: "air-quality-warning",
    name: "Qualidade do Ar Moderada",
    field: "airQuality",
    condition: "above",
    threshold: 300,
    severity: "warning",
    message: "Qualidade do ar acima de 300 ppm — ventilação recomendada",
    enabled: true,
  },
  {
    id: "air-quality-critical",
    name: "Qualidade do Ar Ruim",
    field: "airQuality",
    condition: "above",
    threshold: 600,
    severity: "critical",
    message: "Qualidade do ar acima de 600 ppm — nível perigoso",
    enabled: true,
  },
];

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private rules: AlertRule[] = [...DEFAULT_RULES];
  private triggeredAlerts: TriggeredAlert[] = [];
  private lastTriggered = new Map<string, number>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent("telemetry.processed")
  checkAlerts(data: ProcessedTelemetry): void {
    const now = Date.now();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const value = (data as any)[rule.field];
      if (value === null || value === undefined) continue;

      const triggered =
        rule.condition === "above"
          ? value > rule.threshold
          : value < rule.threshold;

      if (!triggered) continue;

      const lastTime = this.lastTriggered.get(rule.id) ?? 0;
      if (now - lastTime < ALERT_COOLDOWN_MS) continue;

      const alert: TriggeredAlert = {
        id: `${rule.id}-${now}`,
        ruleId: rule.id,
        ruleName: rule.name,
        field: rule.field,
        value,
        threshold: rule.threshold,
        condition: rule.condition,
        severity: rule.severity,
        message: rule.message,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      this.triggeredAlerts.push(alert);
      if (this.triggeredAlerts.length > 100) {
        this.triggeredAlerts = this.triggeredAlerts.slice(-100);
      }

      this.lastTriggered.set(rule.id, now);
      this.eventEmitter.emit("alert.triggered", alert);
      this.logger.warn(
        `[${rule.severity.toUpperCase()}] ${rule.message} (${rule.field}=${value})`,
      );
    }
  }

  getRules(): AlertRule[] {
    return this.rules;
  }

  updateRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const index = this.rules.findIndex((r) => r.id === id);
    if (index === -1) return null;
    this.rules[index] = { ...this.rules[index], ...updates, id };
    return this.rules[index];
  }

  getAlerts(limit = 20): TriggeredAlert[] {
    return this.triggeredAlerts.slice(-limit).reverse();
  }

  acknowledgeAlert(id: string): boolean {
    const alert = this.triggeredAlerts.find((a) => a.id === id);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }
}
