// src/components/LiveChart.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

type Reading = {
  deviceId: string;
  temperature: number;
  humidity: number;
  ts: string; // ISO string
};

export default function LiveChart({
  deviceId = "esp32-001",
  intervalMs = 15000,
  points = 60,
}: {
  deviceId?: string;
  intervalMs?: number;
  points?: number;
}) {
  const [data, setData] = useState<Reading[]>([]);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/readings?deviceId=${encodeURIComponent(deviceId)}&limit=${points}`, { cache: "no-store" });
    const json: Reading[] = await res.json();
    const ordered = json.reverse().map((r) => ({
      ...r,
      ts: new Date(r.ts).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
    setData(ordered);
  }, [deviceId, points]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [fetchData, intervalMs]);

  return (
    <div style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ts" />
          <YAxis yAxisId="left" domain={([min, max]) => [ (min as number) - 2, (max as number) + 2 ]} />
          <YAxis yAxisId="right" orientation="right" domain={([min, max]) => [ (min as number) - 2, (max as number) + 2 ]} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="temperature" name="°C" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="humidity" name="Umidade %" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}