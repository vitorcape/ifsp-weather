"use client";

import { useEffect, useState } from "react";

type AlertItem = {
  title: string;
  severity: "Extremo" | "Grave" | "Moderado" | "Leve" | string;
  area: string;
  effective: string;
  expires: string;
  link?: string;
};

function formatRange(start?: string, end?: string) {
  const fmt = (s?: string) => {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const a = fmt(start);
  const b = fmt(end);
  if (a && b) return `De: ${a} para: ${b}`;
  return a || b || "";
}

const dotStyle = (sev: string): string => {
  if (sev === "Extremo") return "#e53935";   // vermelho
  if (sev === "Grave")   return "#fb8c00";   // laranja
  if (sev === "Moderado")return "#fdd835";   // amarelo
  return "#9e9e9e";                           // cinza
};

export default function WeatherAlerts({
  uf = "SP",
  city = "Catanduva",
  isDay = true,
}: {
  uf?: string;
  city?: string;
  isDay?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `/api/alerts?uf=${encodeURIComponent(uf)}&city=${encodeURIComponent(city)}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        setAlerts(json?.alerts || []);
      } catch {
        if (!alive) return;
        setAlerts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uf, city]);

  // estilos “glass” iguais aos cards da página
  const cardBg  = isDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)";
  const cardBor = isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)";
  const textPri = isDay ? "#1e293b" : "#e2e8f0";
  const textSec = isDay ? "rgba(30,41,59,0.8)" : "rgba(226,232,240,0.8)";

  const containerStyle: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(10px)",
    border: `1px solid ${cardBor}`,
    borderRadius: 16,
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontWeight: 600,
    color: textPri,
  };

  const bodyStyle: React.CSSProperties = {
    padding: "10px 16px 14px 16px",
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️</span>
            <span>Alertas Meteorológicos</span>
          </div>
        </div>
        <div style={bodyStyle}>
          <div style={{ fontSize: 14, color: textSec }}>Carregando alertas…</div>
        </div>
      </div>
    );
  }

  if (!alerts.length) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️</span>
            <span>Alertas Meteorológicos</span>
          </div>
        </div>
        <div style={bodyStyle}>
          <div style={{ fontSize: 14, color: textSec }}>
            Nenhum alerta meteorológico ativo para {city}-{uf}.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Cabeçalho */}
      <div style={headerStyle}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="btn btn-link p-0"
          style={{ textDecoration: "none", color: textPri }}
        >
          <span style={{ marginRight: 8 }}>⚠️</span>
          ALERTAS METEOROLÓGICOS {alerts.length}
          <span style={{ marginLeft: 8 }}>{open ? "▴" : "▾"}</span>
        </button>
      </div>

      {/* Corpo */}
      {open && (
        <div style={bodyStyle}>
          <div className="d-flex flex-column gap-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className="d-flex"
                style={{
                  alignItems: "flex-start",
                  gap: 10,
                  background: isDay ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)",
                  border: `1px solid ${cardBor}`,
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    marginTop: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: dotStyle(a.severity),
                    flex: "0 0 8px",
                  }}
                />
                <div style={{ color: textPri, fontSize: 14, lineHeight: 1.35 }}>
                  <div style={{ fontWeight: 600 }}>
                    {a.title?.replace(/^(Aviso de |Alerta de )/i, "")}
                    {a.severity && a.severity !== "—" ? ` – ${a.severity}` : ""}
                  </div>
                  <div style={{ color: textSec }}>
                    {formatRange(a.effective, a.expires)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}