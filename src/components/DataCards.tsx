// src/components/DataCards.tsx

"use client";

import { useEffect, useState } from "react";

type LastReading = {
  deviceId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  rain_mm2: number;
  wind_ms: number;
  ts: string;
};

export default function DataCards({ refreshMs = 15000 }: { refreshMs?: number }) {
  const [data, setData] = useState<LastReading | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;

    const fetchLastReading = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/readings?limit=1", { cache: "no-store" });
        if (!res.ok) throw new Error("Falha ao buscar dados");
        const json: LastReading[] = await res.json();
        if (alive && json.length > 0) {
          setData(json[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchLastReading();
    const id = setInterval(fetchLastReading, refreshMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [refreshMs]);

  const formatTime = (iso: string) => {
    const dt = new Date(iso);
    return dt.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="row g-3 mb-4 justify-content-center">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="col-12 col-md-6 col-lg-2">
            <div className="card-glass h-100 d-flex align-items-center justify-content-center">
              <div className="spinner-border text-primary" role="status" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="row g-3 mb-4 justify-content-center">
      {["temperature","humidity","pressure","rain_mm2","wind_ms"].map((key) => {
        if (!data) return null;
        let icon, label, value, unit;
        switch (key) {
          case "temperature":
            icon = "fa-temperature-high";
            label = "Temperatura";
            value = data.temperature.toFixed(1);
            unit = "°C";
            break;
          case "humidity":
            icon = "fa-droplet";
            label = "Umidade";
            value = data.humidity.toFixed(0);
            unit = "%";
            break;
          case "pressure":
            icon = "fa-gauge";
            label = "Pressão";
            value = (data.pressure/100).toFixed(0);
            unit = "hPa";
            break;
          case "rain_mm2":
            icon = "fa-cloud-rain";
            label = "Chuva";
            value = data.rain_mm2.toFixed(1);
            unit = "mm²";
            break;
          case "wind_ms":
            icon = "fa-wind";
            label = "Vento";
            value = data.wind_ms.toFixed(1);
            unit = "m/s";
            break;
        }
        return (
          <div key={key} className="col-12 col-md-6 col-lg-2">
            <div className="card-glass p-3 h-100 text-center">
              <div className="mb-2 text-primary">
                <i className={`fa-solid ${icon} fa-2x`} />
              </div>
              <div className="small text-muted mb-1">{label}</div>
              <div className="fs-4 fw-bold">{value}{unit}</div>
              <div className="small text-muted">{formatTime(data.ts)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}