export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCondition = 'above' | 'below';

export interface AlertRule {
  id: string;
  name: string;
  field: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  message: string;
  enabled: boolean;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  field: string;
  value: number;
  threshold: number;
  condition: AlertCondition;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}
