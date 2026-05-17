import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ProcessedTelemetry, TriggeredAlert } from '../types/sensor';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3000' : undefined;
const MAX_HISTORY = 60;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [current, setCurrent] = useState<ProcessedTelemetry | null>(null);
  const [history, setHistory] = useState<ProcessedTelemetry[]>([]);
  const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);
  const [deviceStatus, setDeviceStatus] = useState('offline');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL ?? window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('sensor:data', (data: ProcessedTelemetry) => {
      setCurrent(data);
      setHistory((prev) => {
        const next = [...prev, data];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
    });

    socket.on('sensor:alert', (alert: TriggeredAlert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    socket.on('sensor:status', (data: { status: string }) => {
      setDeviceStatus(data.status);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const base = import.meta.env.DEV ? 'http://localhost:3000' : '';

    fetch(`${base}/api/sensors/history?limit=60`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data);
          setCurrent(data[data.length - 1]);
        }
      })
      .catch(() => {});

    fetch(`${base}/api/alerts?limit=20`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch(() => {});

    fetch(`${base}/api/sensors/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.status) setDeviceStatus(data.status);
      })
      .catch(() => {});
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    const base = import.meta.env.DEV ? 'http://localhost:3000' : '';
    fetch(`${base}/api/alerts/${encodeURIComponent(id)}/acknowledge`, { method: 'PUT' }).catch(() => {});
  }, []);

  return { connected, current, history, alerts, deviceStatus, dismissAlert };
}
