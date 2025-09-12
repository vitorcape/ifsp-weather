"use client";

import { useEffect, useState } from "react";

type ForecastItem = {
  iso: string;
  hourLabel: string;
  temperature: number | null;
  humidity: number | null;
};
type Forecast = {
  day: string;
  items: ForecastItem[];
};

export default function HourlyCards() {
  const [forecast, setForecast] = useState<Forecast | null>(null);

  useEffect(() => {
    fetch("/api/forecast")
      .then(res => res.json())
      .then(data => setForecast(data))
      .catch(console.error);
  }, []);

  if (!forecast) {
    return <div>Carregando previsão...</div>;
  }

  return (
    <section className="mb-4">
      <h5 className="mb-2">Previsão de Hoje ({forecast.day})</h5>
      <div className="d-flex overflow-auto">
        {forecast.items.map(item => (
          <div
            key={item.iso}
            className="card-glass text-center me-2 p-2"
            style={{ minWidth: "80px" }}
          >
            <div className="small text-muted">{item.hourLabel}</div>
            <div className="fs-5">
              {item.temperature != null
                ? `${item.temperature.toFixed(1)}°`
                : "—"}
            </div>
            <div className="small">
              {item.humidity != null
                ? `${item.humidity.toFixed(0)}%`
                : "—"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}