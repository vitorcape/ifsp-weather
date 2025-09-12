"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Reading = { deviceId: string; temperature: number; ts: string };
type Row = { label: string; forecast: number | null; measured: number | null };

const TZ = "America/Sao_Paulo";
const LAT = -21.1383;
const LON = -48.9738;

function isTodaySP(ymd: string): boolean {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return ymd === `${y}-${m}-${d}`;
}

function spMidnightISO(ymd: string) {
  const start = new Date(`${ymd}T00:00:00-03:00`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { sinceISO: start.toISOString(), untilISO: end.toISOString() };
}

export default function ForecastCompareChart({
  deviceId = "esp32-001",
  refreshMs = 60_000,
  dateYMD,
}: {
  deviceId?: string;
  refreshMs?: number;
  dateYMD: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);

      type ForecastJson = { hourly?: { time: string[]; temperature_2m: number[] } };
      const fRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
          `&hourly=temperature_2m&timezone=${encodeURIComponent(TZ)}` +
          `&start_date=${dateYMD}&end_date=${dateYMD}`,
        { cache: "no-store" }
      );
      if (!fRes.ok) throw new Error(`forecast HTTP ${fRes.status}`);
      const fJson = (await fRes.json()) as ForecastJson;

      const fMap = new Map<number, number>();
      fJson.hourly?.time.forEach((t, i) => {
        const hour = Number(t.slice(11, 13));
        fMap.set(hour, fJson.hourly!.temperature_2m[i]);
      });

      const { sinceISO, untilISO } = spMidnightISO(dateYMD);
      const rRes = await fetch(
        `/api/readings?deviceId=${encodeURIComponent(deviceId!)}` +
          `&since=${encodeURIComponent(sinceISO)}` +
          `&until=${encodeURIComponent(untilISO)}` +
          `&limit=2000`,
        { cache: "no-store" }
      );
      if (!rRes.ok) throw new Error(`readings HTTP ${rRes.status}`);
      const rJson = (await rRes.json()) as Reading[];

      const buckets: Array<{ sum: number; n: number } | null> = Array(24).fill(null);
      rJson.forEach(r => {
        const h = new Date(
          new Date(r.ts).toLocaleString("en-US", { timeZone: TZ })
        ).getHours();
        if (!buckets[h]) buckets[h] = { sum: 0, n: 0 };
        buckets[h]!.sum += r.temperature;
        buckets[h]!.n += 1;
      });
      const measuredByHour = buckets.map(b => (b ? b.sum / b.n : null));

      const newRows: Row[] = Array.from({ length: 24 }, (_, h) => ({
        label: `${String(h).padStart(2, "0")}:00`,
        forecast: fMap.get(h) ?? null,
        measured: measuredByHour[h],
      }));
      setRows(newRows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId, dateYMD]);

  useEffect(() => {
    fetchAll();
    const id = isTodaySP(dateYMD) ? setInterval(fetchAll, refreshMs) : undefined;
    return () => {
      if (id) clearInterval(id);
    };
  }, [fetchAll, refreshMs, dateYMD]);

  const data = useMemo(() => rows, [rows]);
  const hasAny = data.some(d => d.forecast != null || d.measured != null);

  return (
    <div className="chart-card p-4">
      <div className="d-flex justify-content-between mb-2">
        {err
          ?<div className="text-warning">Erro: {err}</div>
          :loading&&!hasAny
            ?<div className="text-muted">Carregando…</div>
            :!loading&&!hasAny
              ?<div className="text-muted">Sem dados</div>
              :<></>}
        <div className="small text-muted">Data: {dateYMD.split("-").reverse().join("/")}</div>
      </div>
      {hasAny&&(
        <div style={{height:300}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{top:10,right:10,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
              <XAxis dataKey="label" tick={{fontSize:12}} interval={1}/>
              <YAxis unit="°C" tick={{fontSize:12}} width={50} domain={["auto","auto"]}/>
              <Tooltip formatter={(v,name)=>[typeof v==="number"?v.toFixed(1):v,name]}/>
              <Legend verticalAlign="top" height={36}/>
              <Line type="monotone" dataKey="forecast" name="Previsão (°C)" stroke="#0d6efd" dot={{r:2}}/>
              <Line type="monotone" dataKey="measured" name="Medido (°C)" stroke="#dc3545" dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
