import Header from './Header';
import SensorCard from './SensorCard';
import SensorChart from './SensorChart';
import AlertPanel from './AlertPanel';
import { useSocket } from '../hooks/useSocket';

export default function Dashboard() {
  const { connected, current, history, alerts, deviceStatus, dismissAlert } =
    useSocket();

  const calcMinMax = (field: string) => {
    const values = history
      .map((h) => (h as any)[field])
      .filter((v: any) => v !== null && v !== undefined) as number[];
    if (values.length === 0) return {};
    return { min: Math.min(...values), max: Math.max(...values) };
  };

  return (
    <div className="app">
      <div className="container">
        <Header deviceStatus={deviceStatus} wsConnected={connected} />

        <div className="metrics">
          <SensorCard
            label="Temperatura"
            value={current?.temperature ?? null}
            unit="°C"
            movingAvg={current?.movingAvg?.temperature ?? null}
            trend={current?.trend?.temperature ?? null}
            {...calcMinMax('temperature')}
          />
          <SensorCard
            label="Umidade"
            value={current?.humidity ?? null}
            unit="%"
            movingAvg={current?.movingAvg?.humidity ?? null}
            trend={current?.trend?.humidity ?? null}
            {...calcMinMax('humidity')}
          />
          <SensorCard
            label="Luminosidade"
            value={current?.lux ?? null}
            unit="lx"
            movingAvg={current?.movingAvg?.lux ?? null}
            trend={current?.trend?.lux ?? null}
            {...calcMinMax('lux')}
          />
          <SensorCard
            label="Qualidade do Ar"
            value={current?.airQuality ?? null}
            unit="ppm"
            movingAvg={current?.movingAvg?.airQuality ?? null}
            trend={current?.trend?.airQuality ?? null}
            {...calcMinMax('airQuality')}
          />
          <SensorCard
            label="Índice de Calor"
            value={current?.heatIndex ?? null}
            unit="°C"
            movingAvg={null}
            trend={null}
            {...calcMinMax('heatIndex')}
          />
        </div>

        <div className="bottom-grid">
          <SensorChart history={history} />
          <AlertPanel alerts={alerts} onDismiss={dismissAlert} />
        </div>
      </div>
    </div>
  );
}
