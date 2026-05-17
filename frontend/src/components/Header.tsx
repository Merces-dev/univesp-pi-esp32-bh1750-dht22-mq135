interface Props {
  deviceStatus: string;
  wsConnected: boolean;
}

export default function Header({ deviceStatus, wsConnected }: Props) {
  return (
    <header className="header">
      <div>
        <h1 className="header__title">Sensor Hub</h1>
        <p className="header__subtitle">ESP32 · BH1750 · DHT22 · MQ-135</p>
      </div>
      <div className="header__indicators">
        <div className={`indicator ${deviceStatus === 'online' ? 'indicator--active' : ''}`}>
          <span className="indicator__dot" />
          {deviceStatus === 'online' ? 'Dispositivo online' : 'Dispositivo offline'}
        </div>
        <div className={`indicator ${wsConnected ? 'indicator--active' : ''}`}>
          <span className="indicator__dot" />
          {wsConnected ? 'Tempo real' : 'Desconectado'}
        </div>
      </div>
    </header>
  );
}
