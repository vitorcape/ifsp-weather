// src/app/page.tsx

"use client";

import { useEffect, useState } from "react";
import WeeklyForecast from "@/components/WeeklyForecast";

type Summary = {
  last?: {
    deviceId: string;
    temperature: number;
    humidity: number;
    pressure: number;
    rain_mm2: number;
    wind_ms: number;
    ts: string;
  };
  stats: {
    tMin: number | null;
    tMax: number | null;
    hMin: number | null;
    hMax: number | null;
    count: number;
  };
  windStats: {
    totalWind: number;
    windCount: number;
    avgWind: number;
  };
  sunriseLabel: string;
  sunsetLabel: string;
  isDay: boolean;
  nowISO: string;
};

function formatTime(input?: string | Date) {
  if (!input) return "--:--:-- - --/--/----";
  const dt = typeof input === "string" ? new Date(input) : input;
  return (
    dt.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) +
    " - " +
    dt.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  );
}

function getBackgroundGradient(
  temperature: number,
  isDay: boolean,
  currentHour: number
): string {
  const veryHot = 35;
  const hot = 30;
  const warm = 25;
  const cool = 20;
  const cold = 15;

  if (!isDay) {
    if (temperature >= hot) {
      return "linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 70%, #533483 100%)";
    } else if (temperature >= warm) {
      return "linear-gradient(135deg, #0c0c1e 0%, #1a1a2e 50%, #16213e 100%)";
    } else if (temperature >= cool) {
      return "linear-gradient(135deg, #000428 0%, #004e92 100%)";
    } else {
      return "linear-gradient(135deg, #232526 0%, #414345 100%)";
    }
  } else {
    if (currentHour >= 6 && currentHour < 8) {
      return "linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)";
    } else if (currentHour >= 17 && currentHour < 19) {
      return "linear-gradient(135deg, #ff6b6b 0%, #ffa726 50%, #ffcc02 100%)";
    } else if (temperature >= veryHot) {
      return "linear-gradient(135deg, #ff6b6b 0%, #ffa726 30%, #ffcc02 60%, #fff176 100%)";
    } else if (temperature >= hot) {
      return "linear-gradient(135deg, #ffa726 0%, #ffcc02 50%, #fff176 100%)";
    } else if (temperature >= warm) {
      return "linear-gradient(135deg, #ffcc02 0%, #fff176 50%, #f0f4c3 100%)";
    } else if (temperature >= cool) {
      return "linear-gradient(135deg, #81c784 0%, #64b5f6 50%, #90caf9 100%)";
    } else if (temperature >= cold) {
      return "linear-gradient(135deg, #42a5f5 0%, #64b5f6 50%, #90caf9 100%)";
    } else {
      return "linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #64b5f6 100%)";
    }
  }
}

function getTextColor(isDay: boolean, temperature: number): string {
  if (!isDay) return "#ffffff";
  return temperature >= 25 ? "#333333" : "#ffffff";
}

function getWeatherEmoji(temperature: number, isDay: boolean): string {
  if (!isDay) return temperature >= 25 ? "🌙" : "🌃";
  if (temperature >= 35) return "🔥";
  if (temperature >= 30) return "☀️";
  if (temperature >= 25) return "🌤️";
  if (temperature >= 20) return "⛅";
  if (temperature >= 15) return "🌥️";
  return "❄️";
}

export default function HomeCards({ refreshMs = 15000 }: { refreshMs?: number }) {
  const [data, setData] = useState<Summary | null>(null);
  const [background, setBackground] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    async function load() {
      const res = await fetch("/api/home-summary", { cache: "no-store" });
      const json: Summary = await res.json();
      if (!alive) return;
      setData(json);

      const temp = json.last?.temperature ?? 20;
      const isDay = json.isDay;
      const hour = new Date().getHours();
      setBackground(getBackgroundGradient(temp, isDay, hour));
    }
    load();
    const id = setInterval(load, refreshMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [hydrated, refreshMs]);

  if (!hydrated) {
    return <div className="min-vh-100 w-100" />;
  }

  const last = data?.last;
  const stats = data?.stats;
  const windStats = data?.windStats;

  return (
    <div
      style={{
        background,
        transition: "background 0.8s ease",
        minHeight: "100vh",
        color: getTextColor(data?.isDay ?? true, data?.last?.temperature ?? 20),
      }}
    >
      <div className="container-fluid py-4">
        {/* HERO SECTION - Estilo moderno similar ao da imagem */}
        <section className="text-center py-5 mb-4">
          <div className="mb-3">
            <div style={{ fontSize: "6rem" }}>{getWeatherEmoji(data?.last?.temperature ?? 20, data?.isDay ?? true)}</div>
          </div>
          
          <div style={{ fontSize: "4.5rem", fontWeight: "300", marginBottom: "1rem" }}>
            {last ? `${last.temperature.toFixed(1)}°` : "--°"}
          </div>
          
          <div style={{ fontSize: "1.2rem", opacity: 0.9, marginBottom: "0.5rem" }}>
            {last
            ? last.temperature >= 35
              ? "Muito Quente"
              : last.temperature >= 30
              ? "Quente"
              : last.temperature >= 25
              ? "Agradável"
              : last.temperature >= 20
              ? "Fresco"
              : last.temperature >= 15
              ? "Frio"
              : "Muito Frio"
            : "--"}
          </div>
          
          <div style={{ fontSize: "1rem", opacity: 0.8, marginBottom: "1rem" }}>
            Máx: {stats?.tMax != null ? `${stats.tMax.toFixed(1)}°` : "--°"} • 
            Mín: {stats?.tMin != null ? `${stats.tMin.toFixed(1)}°` : "--°"}
          </div>
          
          <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>
            Catanduva, Brazil
          </div>
          
          <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>
            Última atualização: {last ? formatTime(last.ts) : "--:--:-- - --/--/----"}
          </div>
        </section>

        {/* PREVISÃO SEMANAL - Estilo cards horizontais */}
        <WeeklyForecast />

        {/* DETALHES METEOROLÓGICOS - Cards glass modernos */}
        <section className="row g-3 mb-3">
          {/* Umidade */}
          <div className="col-12 col-md-6">
            <div 
              style={{
                background: data?.isDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "20px",
                border: `1px solid ${data?.isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)"}`,
                height: "100%"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "1.5rem", marginRight: "10px" }}>💧</div>
                <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>UMIDADE</div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "300", marginBottom: "8px" }}>
                {last ? `${last.humidity.toFixed(0)}%` : "--%"}
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                Ponto de orvalho: {last ? `${Math.round(last.temperature - 5)}°` : "--°"}
              </div>
            </div>
          </div>

          {/* Vento */}
          <div className="col-12 col-md-6">
            <div 
              style={{
                background: data?.isDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "20px",
                border: `1px solid ${data?.isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)"}`,
                height: "100%"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "1.5rem", marginRight: "10px" }}>🌬️</div>
                <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>VENTO (24H)</div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "300", marginBottom: "8px" }}>
                {windStats ? `${windStats.totalWind.toFixed(1)} m/s` : "-- m/s"}
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                {windStats && windStats.windCount > 0 
                  ? `Média: ${windStats && windStats.windCount > 0 && windStats.avgWind != null
                  ? `Média: ${windStats.avgWind.toFixed(1)} m/s`
                  : "Sem dados"}} m/s`
                  : "Sem dados"}
              </div>
            </div>
          </div>

          {/* Pressão */}
          <div className="col-12 col-md-6">
            <div 
              style={{
                background: data?.isDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "20px",
                border: `1px solid ${data?.isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)"}`,
                height: "100%"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "1.5rem", marginRight: "10px" }}>📊</div>
                <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>PRESSÃO</div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "300", marginBottom: "8px" }}>
                {last ? `${Math.round(last.pressure / 100)} hPa` : "-- hPa"}
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                {last && last.pressure > 101325 ? "Alta pressão" : "Pressão normal"}
              </div>
            </div>
          </div>

          {/* Chuva */}
          <div className="col-12 col-md-6">
            <div 
              style={{
                background: data?.isDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "20px",
                border: `1px solid ${data?.isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)"}`,
                height: "100%"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "1.5rem", marginRight: "10px" }}>🌧️</div>
                <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>CHUVA</div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "300", marginBottom: "8px" }}>
                {last ? `${last.rain_mm2} mm²` : "-- mm²"}
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                Nas últimas 24h
              </div>
            </div>
          </div>
        </section>

        {/* SOL - Nascer e Pôr do sol */}
        <section className="mb-4">
          <div 
            style={{
              background: data?.isDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: "16px",
              padding: "20px",
              border: `1px solid ${data?.isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)"}`
            }}
          >
            <div className="row">
              <div className="col-6">
                <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ fontSize: "1.2rem", marginRight: "8px" }}>🌅</div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>NASCER DO SOL</div>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "300" }}>
                  {formatTime(data?.sunriseLabel)}
                </div>
              </div>
              <div className="col-6">
                <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ fontSize: "1.2rem", marginRight: "8px" }}>🌅</div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>PÔR DO SOL</div>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "300" }}>
                  {formatTime(data?.sunsetLabel)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Link para página Sobre */}
        <div className="text-center mt-4">
          <a 
            href="/sobre" 
            style={{
              background: data?.isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${data?.isDay ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.3)"}`,
              borderRadius: "25px",
              padding: "12px 24px",
              color: getTextColor(data?.isDay ?? true, data?.last?.temperature ?? 20),
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: "500",
              transition: "all 0.3s ease"
            }}
          >
            <i className="fa-solid fa-circle-info me-2"></i>
            Saiba mais sobre este projeto
          </a>
        </div>
      </div>
    </div>
  );
}