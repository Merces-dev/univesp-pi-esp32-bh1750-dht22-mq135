interface Props {
  label: string;
  value: number | null;
  unit: string;
  movingAvg: number | null;
  trend: 'rising' | 'falling' | 'stable' | null;
  min?: number;
  max?: number;
}

const trendMap: Record<string, string> = {
  rising: '↗',
  falling: '↘',
  stable: '→',
};

export default function SensorCard({
  label,
  value,
  unit,
  movingAvg,
  trend,
  min,
  max,
}: Props) {
  const hasData = value !== null && value !== undefined;

  return (
    <div className="metric">
      <div className="metric__header">
        <span className="metric__label">{label}</span>
        {trend && (
          <span className={`metric__trend metric__trend--${trend}`}>
            {trendMap[trend]}
          </span>
        )}
      </div>

      {hasData ? (
        <>
          <div className="metric__value">
            {value.toFixed(1)}
            <span className="metric__unit">{unit}</span>
          </div>
          <div className="metric__meta">
            <span>{movingAvg !== null ? `Média ${movingAvg}` : '\u00A0'}</span>
            <span>
              {min !== undefined && max !== undefined
                ? `${min.toFixed(1)} – ${max.toFixed(1)}`
                : ''}
            </span>
          </div>
        </>
      ) : (
        <div className="metric__value metric__value--empty">—</div>
      )}
    </div>
  );
}
