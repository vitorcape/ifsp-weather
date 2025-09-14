// src/components/LogTable.tsx

"use client";

import { useEffect, useMemo, useState } from "react";

type Reading = {
  deviceId?: string;
  temperature: number;
  temperature_dht: number;
  humidity: number;
  pressure: number;
  rain_mm2: number;
  wind_ms: number;
  ts: string;
};

export default function LogTable({ refreshMs = 30000 }: { refreshMs?: number }) {
  const [rows, setRows] = useState<Reading[]>([]);
  const [filterId, setFilterId] = useState("");
  const [filterDate, setFilterDate] = useState(""); // "YYYY-MM-DD"
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/readings?limit=999999999", { cache: "no-store" });
      if (!res.ok) {
        console.warn("LogTable fetch status", res.status);
        setRows([]);
        return;
      }
      const data: Reading[] = await res.json();
      // Sort descending by timestamp (most recent first)
      data.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setRows(data);
    } catch (e) {
      console.error("LogTable fetch error", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, refreshMs);
    return () => clearInterval(iv);
  }, [refreshMs]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const byId = !filterId || (r.deviceId?.toLowerCase().includes(filterId.toLowerCase()) ?? false);
      const byDate =
        !filterDate ||
        r.ts.slice(0, 10) === filterDate; // ISO prefix YYYY-MM-DD
      return byId && byDate;
    });
  }, [rows, filterId, filterDate]);

  const fmtDate = (ts: string) =>
    new Date(ts).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
    });

  return (
    <div className="card-glass p-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <h5 className="mb-0">
          Log de Leituras
        </h5>
        <input
          type="date"
          className="form-control table-filter-input"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
        />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="table table-borderless table-striped mb-0">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Device</th>
              <th>Temperatura (°C)</th>
              <th>Temperatura DHT (°C)</th>
              <th>Umidade (%)</th>
              <th>Pressão (Pa)</th>
              <th>Chuva (mm²)</th>
              <th>Vento (km/h)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center">Carregando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center">Nenhum registro</td></tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i}>
                  <td>{fmtDate(r.ts)}</td>
                  <td>{r.deviceId}</td>
                  <td>{r.temperature.toFixed(1)}</td>
                  <td>{r.temperature_dht}</td>
                  <td>{r.humidity.toFixed(0)}</td>
                  <td>{r.pressure.toFixed(0)}</td>
                  <td>{r.rain_mm2.toFixed(1)}</td>
                  <td>{r.wind_ms.toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}