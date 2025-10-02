// src/components/UnifiedChart.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip
} from "recharts";
import ChartTooltip from "./ChartTooltip";

type Reading = {
  deviceId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  rain_mm2: number;
  wind_ms: number;
  ts: string;
  displayTime: string;
};

type Variable = "temperature" | "humidity" | "pressure" | "rain_mm2" | "wind_ms";

const VARIABLES: Record<Variable, { label: string; unit: string; color: string; icon: string }> = {
  temperature: { label: "Temperatura", unit: "°C", color: "#dc3545", icon: "fa-temperature-high" },
  humidity:    { label: "Umidade",    unit: "%",   color: "#0dcaf0", icon: "fa-droplet" },
  pressure:    { label: "Pressão",    unit: "hPa", color: "#ffc107", icon: "fa-gauge" },
  rain_mm2:    { label: "Chuva",      unit: "mm²", color: "#198754", icon: "fa-cloud-rain" },
  wind_ms:     { label: "Vento",      unit: "km/h", color: "#6c757d", icon: "fa-wind" }
};

const TIME_SCALES = {
  "2h":  { label: "2h",  hours: 2 },
  "6h":  { label: "6h",  hours: 6 },
  "12h": { label: "12h", hours: 12 },
  "1d":  { label: "1d",  hours: 24 }
} as const;
type TimeScale = keyof typeof TIME_SCALES;

function getTodayYMD(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
      const scale = TIME_SCALES[selectedTimeScale];
      const start = selectedTimeScale==="1d"
        ? new Date(`${selectedDate}T00:00:00-03:00`)
        : new Date(Date.now() - scale.hours*3600*1000);
      const end = new Date();
      const sinceISO = start.toISOString();
      const untilISO = end.toISOString();

      const res = await fetch(
        `/api/readings?deviceId=${encodeURIComponent(deviceId!)}&since=${sinceISO}&until=${untilISO}&limit=1000`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Erro ao buscar leituras");
      const json = await res.json() as Reading[];

      const sorted = json
        .sort((a,b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
        .map(r => ({
          ...r,
          displayTime: new Date(r.ts).toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo", hour:"2-digit", minute:"2-digit"
          }),
          pressure: r.pressure/100
        }));
      setData(sorted);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo", hour12:false,
        hour:"2-digit", minute:"2-digit", second:"2-digit"
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
  const vals = data.map(d=>d[selectedVariable] as number);
  const minVal = Math.min(...vals), maxVal = Math.max(...vals);
  const pad = (maxVal-minVal)*0.1||1;

  // Y-Axis formatter per variable
  const tickFormatter = (value: number) => {
    switch(selectedVariable) {
      case "temperature": return value.toFixed(1);
      case "humidity":    return value.toFixed(0);
      case "rain_mm2":    return value.toFixed(1);
      case "pressure":    return value.toFixed(0);
      default: return value.toString();
    }
  };

  return (
    <div className="mt-4">
      <div className="row g-3 align-items-center mb-3">
        <div className="col-md-4">
          <label className="form-label">Variável:</label>
          <select className="form-select"
            value={selectedVariable}
            onChange={e=>setSelectedVariable(e.target.value as Variable)}>
            {Object.entries(VARIABLES).map(([key, v])=>
              <option key={key} value={key}>{v.label} ({v.unit})</option>
            )}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Período:</label>
          <select className="form-select"
            value={selectedTimeScale}
            onChange={e=>setSelectedTimeScale(e.target.value as TimeScale)}>
            {Object.entries(TIME_SCALES).map(([k, s])=>
              <option key={k} value={k}>{s.label}</option>
            )}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Data:</label>
          <input type="date" className="form-control"
            value={selectedDate}
            onChange={e=>setSelectedDate(e.target.value)}
            max={getTodayYMD()} />
        </div>
      </div>
      <div className="chart-card p-3">
        <div className="text-muted small mb-2">
          Exibindo {data.length} registros • Atualizado: {lastUpdate}
        </div>
        <div style={{ height: 300 }}>
          {loading && <div className="text-center">Carregando...</div>}
          {!loading && !data.length && <div className="text-center">Sem dados</div>}
          {data.length>0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top:10,right:30,left:20,bottom:5 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={config.color} stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                <XAxis dataKey="displayTime" tick={{fontSize:12}} interval="preserveStartEnd"/>
                <YAxis
                  domain={[minVal-pad, maxVal+pad]}
                  tickMargin={8}
                  tickFormatter={tickFormatter}
                  width={60}
                  label={{
                    value: config.unit,
                    angle:-90,
                    position:"insideLeft",
                    textAnchor:"middle"
                  }}
                />
                <Tooltip content={<ChartTooltip />}/>
                <Area type="monotone" dataKey={selectedVariable}
                  stroke={config.color} fill="url(#grad)" connectNulls/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}