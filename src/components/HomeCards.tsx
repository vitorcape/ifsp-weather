// src/components/HomeCards.tsx
"use client";

import { useEffect, useState } from "react";

type Summary = {
  last?: { deviceId: string; temperature: number; humidity: number; pressure: number; rain_mm2: number; wind_ms: number; ts: string };
  stats: { tMin: number | null; tMax: number | null; hMin: number | null; hMax: number | null; count: number };
  windStats: { totalWind: number; windCount: number; avgWind: number }; // Nova propriedade
  sunriseLabel: string;
  sunsetLabel: string;
  isDay: boolean;
  nowISO: string;
};

function formatTime(input?: string | Date) {
  if (!input) return "--:--";
  if (typeof input === "string") return input; // "HH:MM" já pronto
  return new Date(input).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit"
  });
}

export default function HomeCards({ refreshMs = 15000 }: { refreshMs?: number }) {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/home-summary", { cache: "no-store" });
      const json: Summary = await res.json();
      if (alive) setData(json);
    }
    load();
    const id = setInterval(load, refreshMs);
    return () => { alive = false; clearInterval(id); };
  }, [refreshMs]);

  const last = data?.last;
  const stats = data?.stats;
  const windStats = data?.windStats; // Nova variável

  return (
    <>
      {/* HERO */}
      <section className="hero card-glass mb-4 text-center">
        <div className="display-1">{data?.isDay ? "☀️" : "🌙"}</div>
        <div className="display-4 fw-bold">
          {last ? `${last.temperature.toFixed(1)}°C` : "--°C"} / {last ? `${last.humidity.toFixed(0)}%` : "--%"}
        </div>
        <div className="label-muted mt-2">
          Última atualização: {last ? new Date(last.ts).toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit"
          }) : "--:--"}
        </div>
      </section>

      {/* CARDS */}
      <section className="row g-3 mb-3">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-glass p-3 h-100">
            <i className="fa-solid fa-temperature-high me-2"></i>Temperatura atual
            <div className="fs-3 fw-bold">{last ? `${last.temperature.toFixed(1)}°C` : "--°C"}</div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-glass p-3 h-100">
            <i className="fa-solid fa-cloud me-2"></i>Pressão atual
            <div className="fs-3 fw-bold">{last ? `${last.pressure} Pa` : "-- Pa"}</div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-glass p-3 h-100">
            <i className="fa-solid fa-droplet me-2"></i>Chuva
            <div className="fs-3 fw-bold">{last ? `${last.rain_mm2} mm²` : "-- mm²"}</div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-glass p-3 h-100">
            <i className="fa-solid fa-wind me-2"></i>Vento (24h)
            <div className="fs-3 fw-bold">
              {windStats ? `${windStats.totalWind.toFixed(1)} km/h` : "-- km/h"}
            </div>
          </div>
        </div>
      </section>
      {/* CARDS */}
      <section className="row g-3">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-glass p-3 h-100">
            <i className="fa-solid fa-temperature-arrow-up me-2"></i>Máxima de hoje
            <div className="fs-3 fw-bold">{stats?.tMax != null ? `${stats.tMax.toFixed(1)}°C` : "—"}</div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-glass p-3 h-100">
            <i className="fa-solid fa-temperature-arrow-down me-2"></i>Mínima de hoje
            <div className="fs-3 fw-bold">{stats?.tMin != null ? `${stats.tMin.toFixed(1)}°C` : "—"}</div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-glass p-3 h-100">
            <i className="fa-solid fa-sun me-2"></i>Nascer do sol
            <div className="fs-3 fw-bold">{formatTime(data?.sunriseLabel)}</div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card-glass p-3 h-100">
            <i className="fa-solid fa-moon me-2"></i>Pôr do sol
            <div className="fs-3 fw-bold">{formatTime(data?.sunsetLabel)}</div>
          </div>
        </div>
        {/* link para página Sobre */}
        <div className="text-center mt-4">
          <a href="/sobre" className="btn btn-outline-light" style={{ borderRadius: "20px", fontWeight: "500" }}>
            <i className="fa-solid fa-circle-info me-2"></i>
            Saiba mais sobre este projeto
          </a>
        </div>
      </section>
    </>
  );
}