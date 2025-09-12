"use client";

import { useEffect, useState } from "react";

type Day = {
    date: string;
    tMax: number | null;
    tMin: number | null;
    weathercode: number | null;
};

const CODE_EMOJI: Record<number, string> = {
    0: "☀️", 1: "☀️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌧️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    80: "🌦️", 81: "🌦️", 82: "🌧️",
    95: "⛈️", 96: "⛈️", 99: "⛈️",
};

export default function WeeklyForecast() {
    const [days, setDays] = useState<Day[]>([]);

    useEffect(() => {
        fetch("/api/forecast")
            .then(res => res.json())
            .then((data: { days: Day[] }) => setDays(data.days))
            .catch(console.error);
    }, []);

    if (days.length === 0) return <div>Carregando previsão semanal...</div>;

    return (
    <section className="mb-4">
      <div className="row g-2 text-center">
        {days.slice(1).map(day => {
          const dt = new Date(day.date + "T00:00:00");
          const label = dt.toLocaleDateString("pt-BR", {
            weekday: "short", day: "2-digit", month: "2-digit"
          });
          const emoji = day.weathercode != null
            ? (CODE_EMOJI[day.weathercode] ?? "❔")
            : "—";
          return (
            <div key={day.date} className="col-12 col-md-6 col-lg-2">
              <div className="card-glass h-100">
                <div className="small text-muted mb-1">{label}</div>
                <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>{emoji}</div>
                <div className="fs-6">
                  {day.tMax != null ? `${day.tMax.toFixed(1)}°` : "—"}
                </div>
                <div className="small text-muted">
                  {day.tMin != null ? `${day.tMin.toFixed(1)}°` : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}