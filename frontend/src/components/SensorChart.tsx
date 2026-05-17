import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { ProcessedTelemetry } from '../types/sensor';

interface Props {
  history: ProcessedTelemetry[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: 6,
        padding: '10px 14px',
        fontSize: 12,
      }}
    >
      <div style={{ color: '#71717a', marginBottom: 6, fontSize: 11 }}>{label}</div>
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 2,
          }}
        >
          <span style={{ color: '#a1a1aa' }}>{p.name}</span>
          <span style={{ color: '#fafafa', fontVariantNumeric: 'tabular-nums' }}>
            {p.value !== null ? p.value.toFixed(1) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function SensorChart({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="panel">
        <div className="panel__title">Histórico</div>
        <div className="empty-state">
          <div className="empty-state__text">Aguardando dados do sensor</div>
        </div>
      </div>
    );
  }

  const data = history.map((h) => ({
    time: formatTime(h.timestamp),
    Temperatura: h.temperature,
    Umidade: h.humidity,
    Luminosidade: h.lux,
    'Qual. Ar': h.airQuality,
  }));

  return (
    <div className="panel">
      <div className="panel__title">Histórico</div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="Temperatura"
              stroke="#ef4444"
              fill="url(#gT)"
              strokeWidth={1.5}
              dot={false}
              name="Temp °C"
              connectNulls
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="Umidade"
              stroke="#3b82f6"
              fill="url(#gH)"
              strokeWidth={1.5}
              dot={false}
              name="Umid %"
              connectNulls
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="Luminosidade"
              stroke="#f59e0b"
              fill="url(#gL)"
              strokeWidth={1.5}
              dot={false}
              name="Lux"
              connectNulls
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="Qual. Ar"
              stroke="#22c55e"
              fill="url(#gA)"
              strokeWidth={1.5}
              dot={false}
              name="Ar ppm"
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
