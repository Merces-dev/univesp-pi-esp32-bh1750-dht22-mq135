import type { TriggeredAlert } from '../types/sensor';

interface Props {
  alerts: TriggeredAlert[];
  onDismiss: (id: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  return `${hr}h`;
}

const fieldUnit: Record<string, string> = {
  temperature: '°C',
  humidity: '%',
  lux: 'lx',
  heatIndex: '°C',
  airQuality: 'ppm',
};

export default function AlertPanel({ alerts, onDismiss }: Props) {
  return (
    <div className="panel">
      <div className="panel__title">Alertas · {alerts.length}</div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__text">Nenhum alerta ativo</div>
        </div>
      ) : (
        <div className="alert-list">
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert-item alert-item--${alert.severity}`}>
              <div className="alert-item__content">
                <div className="alert-item__title">{alert.ruleName}</div>
                <div className="alert-item__message">{alert.message}</div>
                <div className="alert-item__value">
                  {alert.value.toFixed(1)}{fieldUnit[alert.field] ?? ''} · limite{' '}
                  {alert.condition === 'above' ? '>' : '<'} {alert.threshold}
                  {fieldUnit[alert.field] ?? ''}
                </div>
              </div>
              <span className="alert-item__time">{timeAgo(alert.timestamp)}</span>
              <button
                className="alert-item__dismiss"
                onClick={() => onDismiss(alert.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
