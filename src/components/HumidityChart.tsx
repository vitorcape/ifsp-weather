// src/components/HumidityChart.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip
} from "recharts";
import ChartTooltip from "./ChartTooltip";

type Reading = {
  deviceId: string;
  temperature: number;
  humidity: number;
  ts: string; // ISO
};

export default function HumidityChart({
  deviceId = "esp32-001",
  intervalMs = 15000,
}: { deviceId?: string; intervalMs?: number }) {
  const [data, setData] = useState<Reading[]>([]);

  const fetchData = useCallback(async () => {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const sinceISO = new Date(Date.now() - TWO_HOURS).toISOString();
  const res = await fetch(
    `/api/readings?deviceId=${encodeURIComponent(deviceId)}&since=${sinceISO}&limit=200`,
    { cache: "no-store" }
  );
  const json: Reading[] = await res.json();
  const ordered = json
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .map((r) => ({
      ...r,
      ts: new Date(r.ts).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  setData(ordered);
}, [deviceId]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [fetchData, intervalMs]);

  return (
    <div style={{ width: "100%", height: 340 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 12 }}>
          <defs>
            <linearGradient id="humFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#BDEDFC" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#BDEDFC" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="4 6" />
          <XAxis dataKey="ts" interval="preserveStartEnd" tickMargin={8} />
          <YAxis
            domain={([min, max]) => [ (min as number) - 2, (max as number) + 2 ]}
            tickMargin={8}
            width={28}
            label={{ value: "%", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<ChartTooltip unit="%" />} />
          <Area
            type="monotone"
            dataKey="humidity"
            name="Umidade (%)"
            stroke="#0b7fab"
            strokeWidth={3}
            fill="url(#humFill)"
            dot={{ r: 3, stroke: "#0b7fab", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}