// src/components/CalendarView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

type DaySummary = {
  day: string;              // "YYYY-MM-DD"
  weekday: string;          // "segunda-feira"
  sunriseLabel: string;     // "HH:MM"
  sunsetLabel: string;      // "HH:MM"
  stats: {
    tMin: number | null;
    tMax: number | null;
    hAvg: number | null;
    count: number;
    // CAMPO OPCIONAL (se sua API já expõe; se não, mostramos "—")
    pAvg?: number | null;       // pressão média (Pa)
    rainMm?: number | null;     // chuva acumulada (mm)
    windAvg?: number | null;    // vento médio (m/s)
    windMax?: number | null;    // rajada máx (m/s)
  };
};

const TZ = "America/Sao_Paulo";

/** hoje no fuso de SP */
function todaySP(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}
/** Date -> "YYYY-MM-DD" no fuso de SP */
function toYMD_SP(d: Date): string {
  const x = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
/** "YYYY-MM-DD" -> "DD/MM/YYYY" */
function ymdToBR(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** heurística simples de dia/noite para cores (06–18 = dia) */
function isDayNowSP(): boolean {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: TZ, hour: "2-digit", hour12: false }));
  return h >= 6 && h < 18;
}

export default function CalendarView() {
  const [selected, setSelected] = useState<Date>(todaySP());
  const [data, setData] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ymd = useMemo(() => toYMD_SP(selected), [selected]);
  const weekdayPretty = useMemo(() => {
    if (!data?.weekday) return "—";
    return data.weekday.charAt(0).toUpperCase() + data.weekday.slice(1);
  }, [data?.weekday]);

  const isDay = isDayNowSP();
  const cardBg  = isDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)";
  const cardBor = isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)";
  const textPri = isDay ? "#1e293b" : "#e2e8f0";
  const textSec = isDay ? "rgba(30,41,59,0.8)" : "rgba(226,232,240,0.85)";
  const accent  = isDay ? "rgba(37,99,235,0.9)" : "rgba(147,197,253,0.95)"; // azul

  // carrega resumo quando a data muda
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/day-summary?date=${encodeURIComponent(ymd)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: DaySummary = await res.json();
        if (alive) setData(json);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (alive) setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [ymd]);

  // valores opcionais com fallback elegante
  const pAvgPa   = data?.stats?.pAvg ?? null;
  const pAvgHpa  = pAvgPa != null ? Math.round(pAvgPa / 100) : null; // se sua API já vier em Pa
  const rainMm   = data?.stats?.rainMm ?? null;
  const windAvg  = data?.stats?.windAvg ?? null;
  const windMax  = data?.stats?.windMax ?? null;

  return (
    <div className="row g-3">
      {/* Esquerda: calendário (col menor) */}
      <div className="col-12 col-xl-4">
        <div
          className="p-3"
          style={{
            background: cardBg,
            backdropFilter: "blur(10px)",
            border: `1px solid ${cardBor}`,
            borderRadius: 16,
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-2" style={{ color: textPri }}>
            <div className="fw-semibold"><i className="fa-regular fa-calendar me-2"></i>Selecione uma data</div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm"
                style={{
                  background: "transparent",
                  border: `1px solid ${cardBor}`,
                  color: textPri,
                  borderRadius: 999,
                  padding: "4px 10px",
                }}
                onClick={() => setSelected(todaySP())}
                title="Ir para hoje"
              >
                Hoje
              </button>
              <button
                className="btn btn-sm"
                style={{
                  background: "transparent",
                  border: `1px solid ${cardBor}`,
                  color: textPri,
                  borderRadius: 999,
                  padding: "4px 10px",
                }}
                onClick={() => setSelected(todaySP())}
                title="Resetar seleção"
              >
                Resetar
              </button>
            </div>
          </div>

          {/* Wrapper limita a largura “real” do calendário */}
          <div style={{ maxWidth: 380, margin: "0 auto" }}>
            <DayPicker
              mode="single"
              locale={ptBR}
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              weekStartsOn={1}
              showOutsideDays
              fromYear={2023}
              toYear={2030}
              captionLayout="dropdown"
              disabled={{ after: todaySP() }}
            />
          </div>

          <div className="small mt-2" style={{ color: textSec }}>
            Data selecionada: <span className="fw-semibold" style={{ color: textPri }}>{ymdToBR(ymd)}</span>
          </div>

          {/* Estilos DayPicker (tema) */}
          <style jsx global>{`
            .rdp {
              --rdp-accent-color: ${accent};
              --rdp-background-color: ${isDay ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.08)"};
              color: ${textPri};
            }
            .rdp-caption_label, .rdp-nav_button { color: ${textPri}; }
            .rdp-dropdown_year, .rdp-dropdown_month {
              background: ${isDay ? "rgba(255,255,255,0.6)" : "rgba(17,24,39,0.3)"};
              color: ${textPri};
              border: 1px solid ${cardBor};
              border-radius: 10px;
              padding: 6px 8px;
            }
            .rdp-head_cell { color: ${textSec}; font-weight: 600; }
            .rdp-day { border-radius: 10px; }
            .rdp-day:hover { background: ${isDay ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.12)"} !important; }
            .rdp-day_selected, .rdp-day_selected:hover {
              background: ${accent} !important;
              color: #ffffff !important;
              box-shadow: 0 0 0 1px ${accent};
            }
            .rdp-day_today { box-shadow: inset 0 0 0 2px ${accent}; border-radius: 10px; }
            .rdp-caption_dropdowns { gap: 8px; }
          `}</style>
        </div>
      </div>

      {/* Direita: informações do dia (col maior) */}
      <div className="col-12 col-xl-8">
        <div
          className="p-3 h-100"
          style={{
            background: cardBg,
            backdropFilter: "blur(10px)",
            border: `1px solid ${cardBor}`,
            borderRadius: 16,
            color: textPri,
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h2 className="h5 m-0" style={{ color: textPri }}>
              <i className="fa-solid fa-circle-info me-2"></i> Informações do dia
            </h2>
            <span className="chart-badge">{ymdToBR(ymd)}</span>
          </div>

          {loading && <div className="text-muted" style={{ color: textSec }}>Carregando…</div>}
          {err && <div className="text-warning">Erro: {err}</div>}

          {!loading && !err && (
            <>
              <div className="mb-2" style={{ color: textPri }}>
                <i className="fa-solid fa-calendar-day me-2"></i>
                <span className="fw-semibold">{weekdayPretty}</span>
              </div>

              {/* GRID de métricas — agora com pressão, chuva e vento */}
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <div className="p-2 rounded" style={{ background: isDay ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)", border: `1px solid ${cardBor}` }}>
                    <div className="small text-uppercase fw-semibold" style={{ color: textSec }}>☀️ Temp. Máxima</div>
                    <div className="fs-4 fw-bold" style={{ color: textPri }}>
                      {data?.stats.tMax != null ? `${data.stats.tMax.toFixed(1)}°C` : "—"}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-2 rounded" style={{ background: isDay ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)", border: `1px solid ${cardBor}` }}>
                    <div className="small text-uppercase fw-semibold" style={{ color: textSec }}>⛅️ Temp. Mínima</div>
                    <div className="fs-4 fw-bold" style={{ color: textPri }}>
                      {data?.stats.tMin != null ? `${data.stats.tMin.toFixed(1)}°C` : "—"}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-2 rounded" style={{ background: isDay ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)", border: `1px solid ${cardBor}` }}>
                    <div className="small text-uppercase fw-semibold" style={{ color: textSec }}>🌅 Nascer do sol</div>
                    <div className="fs-4 fw-bold" style={{ color: textPri }}>
                      {data?.sunriseLabel ?? "—:—"}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-2 rounded" style={{ background: isDay ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)", border: `1px solid ${cardBor}` }}>
                    <div className="small text-uppercase fw-semibold" style={{ color: textSec }}>🌅 Pôr do sol</div>
                    <div className="fs-4 fw-bold" style={{ color: textPri }}>
                      {data?.sunsetLabel ?? "—:—"}
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="p-2 rounded" style={{ background: isDay ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)", border: `1px solid ${cardBor}` }}>
                    <div className="small text-uppercase fw-semibold" style={{ color: textSec }}>💧 Umidade média</div>
                    <div className="fs-4 fw-bold" style={{ color: textPri }}>
                      {data?.stats.hAvg != null ? `${Math.round(data.stats.hAvg)}%` : "—"}
                    </div>
                  </div>
                </div>

                {/* NOVOS CARDS */}
                <div className="col-12 col-md-6">
                  <div className="p-2 rounded" style={{ background: isDay ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)", border: `1px solid ${cardBor}` }}>
                    <div className="small text-uppercase fw-semibold" style={{ color: textSec }}>📊 Pressão média</div>
                    <div className="fs-4 fw-bold" style={{ color: textPri }}>
                      {pAvgHpa != null ? `${pAvgHpa} hPa` : "— hPa"}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-2 rounded" style={{ background: isDay ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)", border: `1px solid ${cardBor}` }}>
                    <div className="small text-uppercase fw-semibold" style={{ color: textSec }}>🌧️ Chuva (acumulada)</div>
                    <div className="fs-4 fw-bold" style={{ color: textPri }}>
                      {rainMm != null ? `${rainMm.toFixed(1)} mm` : "— mm"}
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="p-2 rounded" style={{ background: isDay ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)", border: `1px solid ${cardBor}` }}>
                    <div className="small text-uppercase fw-semibold" style={{ color: textSec }}>🌬️ Vento</div>
                    <div className="fs-5 fw-bold" style={{ color: textPri }}>
                      {windAvg != null ? `Média: ${windAvg.toFixed(1)} m/s` : "Média: — m/s"}
                      {" · "}
                      {windMax != null ? `Rajada: ${windMax.toFixed(1)} m/s` : "Rajada: — m/s"}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}