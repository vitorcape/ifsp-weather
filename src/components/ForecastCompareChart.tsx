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

type Reading = { deviceId: string; temperature: number; humidity: number; ts: string };
type Row = { hour: number; label: string; forecast: number | null; measured: number | null };

const TZ = "America/Sao_Paulo";
const LAT = -21.1383; // Catanduva
const LON = -48.9738;

function isTodaySP(ymd: string): boolean {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return ymd === `${y}-${m}-${d}`;
}

function spMidnightISO(ymd: string) {
  // meia-noite em SP daquele dia -> ISO UTC
  const start = new Date(`${ymd}T00:00:00-03:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { sinceISO: start.toISOString(), untilISO: end.toISOString() };
}

export default function ForecastCompareChart({
  deviceId = "esp32-001",
  refreshMs = 60_000,
  dateYMD,
}: {
  deviceId?: string;
  refreshMs?: number;
  dateYMD: string; // "YYYY-MM-DD"
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);

      // 1) Open-Meteo previsão horária para a data selecionada (timezone local SP)
      const urlForecast =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&hourly=temperature_2m` +
        `&timezone=${encodeURIComponent(TZ)}` +
        `&start_date=${dateYMD}&end_date=${dateYMD}`;

      const fRes = await fetch(urlForecast, { cache: "no-store" });
      if (!fRes.ok) throw new Error(`forecast HTTP ${fRes.status}`);
      const fJson = (await fRes.json()) as {
        hourly?: { time: string[]; temperature_2m: number[] };
      };

      const fMap = new Map<number, number>();
      if (fJson?.hourly?.time && fJson.hourly.temperature_2m) {
        for (let i = 0; i < fJson.hourly.time.length; i++) {
          const t = fJson.hourly.time[i]; // "YYYY-MM-DDTHH:00"
          const hour = Number(t.slice(11, 13));
          fMap.set(hour, fJson.hourly.temperature_2m[i]);
        }
      }

      // 2) Leituras do Mongo para aquele dia (janela SP -> ISO UTC)
      const { sinceISO, untilISO } = spMidnightISO(dateYMD);
      const rUrl =
        `/api/readings?deviceId=${encodeURIComponent(deviceId)}` +
        `&since=${encodeURIComponent(sinceISO)}` +
        `&until=${encodeURIComponent(untilISO)}` +
        `&limit=2000`;

      const rRes = await fetch(rUrl, { cache: "no-store" });
      if (!rRes.ok) throw new Error(`readings HTTP ${rRes.status}`);
      const rJson = (await rRes.json()) as Reading[];

      // agrega "medido" por hora (média)
      const buckets = new Array<{ sum: number; n: number } | null>(24).fill(null);
      for (const r of rJson) {
        const d = new Date(new Date(r.ts).toLocaleString("en-US", { timeZone: TZ }));
        const h = d.getHours();
        if (!buckets[h]) buckets[h] = { sum: 0, n: 0 };
        buckets[h]!.sum += r.temperature;
        buckets[h]!.n += 1;
      }
      const measuredByHour = buckets.map((b) => (b ? b.sum / b.n : null));

      // linhas 0..23
      const newRows: Row[] = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, "0")}:00`,
        forecast: fMap.get(h) ?? null,
        measured: measuredByHour[h],
      }));

      setRows(newRows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId, dateYMD]);

  // atualiza; se for HOJE, mantém polling; datas passadas sem polling
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchAll();
    })();
    const id = isTodaySP(dateYMD) ? setInterval(fetchAll, refreshMs) : undefined;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [fetchAll, refreshMs, dateYMD]);

  // dados para Recharts
  const data = useMemo(() => rows.map((r) => ({ ...r })), [rows]);

  const hasAny =
    data.some((d) => d.measured != null) || data.some((d) => d.forecast != null);

  return (
    <div style={{ width: "100%", height: 380 }}>
      {err && (
        <div className="text-warning small mb-2">Falha ao carregar: {err}</div>
      )}
      {loading && !hasAny && <div className="text-muted">Carregando…</div>}
      {!loading && !hasAny && !err && (
        <div className="text-muted">Sem dados para esta data.</div>
      )}

      {hasAny && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" opacity={0.25} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              interval={1}
              minTickGap={8}
            />
            <YAxis
              unit="°C"
              tick={{ fontSize: 12 }}
              width={50}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(value: unknown, name: string) => {
                if (typeof value === "number") return [value.toFixed(1), name];
                return [value as string, name];
              }}
              labelFormatter={(l) => `Hora: ${l}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Previsão (°C)"
              stroke="#0d6efd"    // azul
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="measured"
              name="Medido (°C)"
              stroke="#dc3545"    // vermelho
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}