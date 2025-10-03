// src/components/UnifiedChart.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip
} from "recharts";
import ChartTooltip from "./ChartTooltip";

type ReadingRaw = {
  deviceId: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;   // em Pa no banco
  rain_mm2: number | null;
  wind_ms: number | null;    // em m/s no banco
  ts: string;                // ISO
};

type Reading = ReadingRaw & {
  displayTime: string;
  pressure: number | null;   // normalizado para hPa
  wind_ms: number | null;    // normalizado para km/h (mantemos a chave por compatibilidade)
};

type Variable = "temperature" | "humidity" | "pressure" | "rain_mm2" | "wind_ms";

const VARIABLES: Record<Variable, { label: string; unit: string; color: string; icon: string }> = {
  temperature: { label: "Temperatura", unit: "°C",  color: "#dc3545", icon: "fa-temperature-high" },
  humidity:    { label: "Umidade",     unit: "%",   color: "#0dcaf0", icon: "fa-droplet" },
  pressure:    { label: "Pressão",     unit: "hPa", color: "#ffc107", icon: "fa-gauge" },
  rain_mm2:    { label: "Chuva",       unit: "mm",  color: "#198754", icon: "fa-cloud-rain" },
  wind_ms:     { label: "Vento",       unit: "km/h",color: "#6c757d", icon: "fa-wind" }
};

const TIME_SCALES = {
  "2h":  { label: "2h",  hours: 2 },
  "6h":  { label: "6h",  hours: 6 },
  "12h": { label: "12h", hours: 12 },
  "1d":  { label: "1d",  hours: 24 }
} as const;
type TimeScale = keyof typeof TIME_SCALES;

const TZ = "America/Sao_Paulo";

function getTodayYMD(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// helpers de fuso
function toSP(d: Date) {
  return new Date(new Date(d).toLocaleString("en-US", { timeZone: TZ }));
}
function startOfDaySP(d: Date) { const x = toSP(d); x.setHours(0,0,0,0); return x; }
function endOfDaySP(d: Date)   { const x = toSP(d); x.setHours(23,59,59,999); return x; }

export default function UnifiedChart({
  deviceId = "esp32-001",
  refreshMs = 30000
}: {
  deviceId?: string;
  refreshMs?: number;
}) {
  const [data, setData] = useState<Reading[]>([]);
  const [selectedVariable, setSelectedVariable] = useState<Variable>("temperature");
  const [selectedTimeScale, setSelectedTimeScale] = useState<TimeScale>("1d");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayYMD());
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // monta intervalo em SP
      const base = new Date(`${selectedDate}T00:00:00-03:00`); // âncora da data
      let from: Date, to: Date;

      if (selectedTimeScale === "1d") {
        from = startOfDaySP(base);
        to   = endOfDaySP(base);
      } else {
        to   = endOfDaySP(base);
        from = new Date(to);
        from.setHours(from.getHours() - TIME_SCALES[selectedTimeScale].hours);
        // garante início alinhado ao dia certo
        from = toSP(from);
      }

      const qs = new URLSearchParams({
        deviceId,
        from: from.toISOString(),
        to:   to.toISOString(),
        limit: "1000"
      });

      const res = await fetch(`/api/readings?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Erro ao buscar leituras (HTTP ${res.status})`);

      const json = await res.json();
      const arr: ReadingRaw[] = Array.isArray(json) ? json : (json?.items ?? []);

      const sorted: Reading[] = arr
        .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
        .map(r => {
          const localTime = new Date(r.ts).toLocaleTimeString("pt-BR", {
            timeZone: TZ, hour: "2-digit", minute: "2-digit"
          });
          // normalizações de unidade
          const pressureHpa = r.pressure != null ? r.pressure / 100 : null;      // Pa -> hPa
          const windKmh     = r.wind_ms  != null ? r.wind_ms  * 3.6 : null;       // m/s -> km/h

          return {
            ...r,
            pressure: pressureHpa,
            wind_ms: windKmh, // mantemos a chave "wind_ms" para não quebrar o gráfico; agora contém km/h
            displayTime: localTime
          };
        });

      setData(sorted);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR", {
        timeZone: TZ, hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit"
      }));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId, selectedTimeScale, selectedDate]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, refreshMs);
    return () => clearInterval(iv);
  }, [fetchData, refreshMs]);

  const config = VARIABLES[selectedVariable];
  const values = data
    .map(d => (d[selectedVariable] as number | null))
    .filter((v): v is number => v != null);

  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 1;
  const pad = (maxVal - minVal) * 0.1 || 1;

  const tickFormatter = (value: number) => {
    switch (selectedVariable) {
      case "temperature": return value.toFixed(1);
      case "humidity":    return value.toFixed(0);
      case "rain_mm2":    return value.toFixed(1);
      case "pressure":    return value.toFixed(0);
      case "wind_ms":     return value.toFixed(1);
      default: return String(value);
    }
  };

  return (
    <div className="mt-4">
      <div className="row g-3 align-items-center mb-3">
        <div className="col-md-4">
          <label className="form-label">Variável:</label>
          <select className="form-select"
            value={selectedVariable}
            onChange={e => setSelectedVariable(e.target.value as Variable)}>
            {Object.entries(VARIABLES).map(([key, v]) =>
              <option key={key} value={key}>{v.label} ({v.unit})</option>
            )}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Período:</label>
          <select className="form-select"
            value={selectedTimeScale}
            onChange={e => setSelectedTimeScale(e.target.value as TimeScale)}>
            {Object.entries(TIME_SCALES).map(([k, s]) =>
              <option key={k} value={k}>{s.label}</option>
            )}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Data:</label>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={getTodayYMD()}
          />
        </div>
      </div>

      <div className="chart-card p-3">
        <div className="text-muted small mb-2">
          Exibindo {data.length} registros • Atualizado: {lastUpdate}
        </div>
        <div style={{ height: 300 }}>
          {loading && <div className="text-center">Carregando...</div>}
          {!loading && !data.length && <div className="text-center">Sem dados</div>}
          {data.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={config.color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={config.color} stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                <XAxis dataKey="displayTime" tick={{ fontSize: 12 }} interval="preserveStartEnd"/>
                <YAxis
                  domain={[minVal - pad, maxVal + pad]}
                  tickMargin={8}
                  tickFormatter={tickFormatter}
                  width={60}
                  label={{
                    value: config.unit,
                    angle: -90,
                    position: "insideLeft",
                    textAnchor: "middle"
                  }}
                />
                <Tooltip content={<ChartTooltip />}/>
                <Area
                  type="monotone"
                  dataKey={selectedVariable}
                  stroke={config.color}
                  fill="url(#grad)"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}