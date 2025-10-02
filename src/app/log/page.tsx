// src/app/log/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";

type Reading = {
  _id: string;
  deviceId: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  rain_mm2: number | null;
  wind_ms: number | null;
  ts: string; // ISO string
};

const TZ = "America/Sao_Paulo";

function todaySP() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}
function startOfDaySP(d: Date) {
  const x = new Date(new Date(d).toLocaleString("en-US", { timeZone: TZ }));
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDaySP(d: Date) {
  const x = new Date(new Date(d).toLocaleString("en-US", { timeZone: TZ }));
  x.setHours(23, 59, 59, 999);
  return x;
}
function fmtLocal(dtISO: string) {
  const d = new Date(dtISO);
  return d.toLocaleString("pt-BR", { timeZone: TZ });
}

const ALL_COLUMNS = [
  { key: "deviceId", label: "Device" },
  { key: "temperature", label: "Temp (oC)" },
  { key: "humidity", label: "Umidade (%)" },
  { key: "pressure", label: "Pressao (Pa)" },
  { key: "rain_mm2", label: "Chuva (mm)" },
  { key: "wind_ms", label: "Vento (km/h)" },
  { key: "ts", label: "Timestamp" },
] as const;
type ColKey = typeof ALL_COLUMNS[number]["key"];

export default function LogPage() {
  // Filtros
  const [range, setRange] = useState<DateRange | undefined>({
    from: startOfDaySP(todaySP()),
    to: endOfDaySP(todaySP()),
  });
  const [deviceId, setDeviceId] = useState("");
  const [limit, setLimit] = useState<number>(500);

  // Colunas escolhidas
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(
    ["deviceId", "temperature", "humidity", "pressure", "rain_mm2", "wind_ms", "ts"]
  );

  // Dados
  const [rows, setRows] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Query string para API
  const params = useMemo(() => {
    if (!range?.from || !range?.to) return "";
    const from = startOfDaySP(range.from).toISOString();
    const to = endOfDaySP(range.to).toISOString();
    const qs = new URLSearchParams({ from, to, limit: String(limit) });
    if (deviceId.trim()) qs.set("deviceId", deviceId.trim());
    return qs.toString();
  }, [range?.from, range?.to, deviceId, limit]);

  async function load() {
    if (!params) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/readings?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.items;
      const safe: Reading[] = (arr ?? []) as Reading[];
      // garantir ordenação decrescente por ts
      safe.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setRows(safe);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [params]);

  // UI helpers de coluna
  function toggleCol(k: ColKey) {
    setVisibleCols(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  }
  const allOn = visibleCols.length === ALL_COLUMNS.length;
  function toggleAllCols() {
    setVisibleCols(allOn ? [] : ALL_COLUMNS.map(c => c.key));
  }

  // Exportações
  function downloadFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const payload = JSON.stringify(rows, null, 2);
    downloadFile(`leituras_${Date.now()}.json`, payload, "application/json;charset=utf-8");
  }

  function csvEscape(val: any) {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function exportCSV() {
    // só exportar as colunas visíveis, na ordem atual
    const headers = visibleCols.map(k => {
      const meta = ALL_COLUMNS.find(c => c.key === k)!;
      return meta.label;
    });

    const lines = rows.map(r =>
      visibleCols.map(k => {
        let v: any = (r as any)[k];
        if (k === "ts") v = fmtLocal(r.ts); // exportar já legível
        return csvEscape(v);
      }).join(";")
    );

    const csv = [headers.join(";"), ...lines].join("\n");
    downloadFile(`leituras_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
  }

  const isDay = true;
  const cardBg = isDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)";
  const cardBor = isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)";

  return (
    <div className="container py-4">
      {/* Cabeçalho */}
      <section className="chart-card mb-3 p-3" style={{ background: cardBg, border: `1px solid ${cardBor}`, borderRadius: 16 }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
          <h2 className="m-0 text-white">
            <i className="fa-solid fa-list me-2"></i>
            Log de Leituras
          </h2>

          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-outline-light" onClick={exportJSON}>
              <i className="fa-solid fa-file-code me-2"></i> Exportar JSON
            </button>
            <button className="btn btn-outline-light" onClick={exportCSV}>
              <i className="fa-solid fa-file-csv me-2"></i> Exportar CSV
            </button>
            <button className="btn btn-primary" onClick={load}>
              <i className="fa-solid fa-rotate me-2"></i> Atualizar
            </button>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="chart-card mb-3 p-3" style={{ background: cardBg, border: `1px solid ${cardBor}`, borderRadius: 16 }}>
        <div className="row g-3">
          <div className="col-12 col-lg-4">
            <div className="p-2" style={{ background: cardBg, border: `1px solid ${cardBor}`, borderRadius: 12 }}>
              <div className="fw-semibold mb-2">
                <i className="fa-regular fa-calendar-range me-2"></i>Período
              </div>
              <DayPicker
                mode="range"
                selected={range}
                onSelect={(r: DateRange | undefined) => setRange(r ?? undefined)}
                locale={ptBR}
                weekStartsOn={1}
                showOutsideDays
                fromYear={2023}
                toYear={2030}
                captionLayout="dropdown"
              />
            </div>
          </div>

          <div className="col-12 col-lg-8">
            <div className="p-2" style={{ background: cardBg, border: `1px solid ${cardBor}`, borderRadius: 12 }}>
              <div className="row g-3">
                <div className="col-12 col-md-6 col-xl-4">
                  <label className="form-label mb-1">Device ID</label>
                  <input
                    className="form-control"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="col-6 col-md-3 col-xl-2">
                  <label className="form-label mb-1">Limite</label>
                  <input
                    type="number"
                    className="form-control"
                    value={limit}
                    min={1}
                    max={5000}
                    onChange={(e) => setLimit(Math.max(1, Math.min(5000, Number(e.target.value || 1))))}
                  />
                </div>
                <div className="col-12 d-flex align-items-end">
                  <button className="btn btn-primary ms-auto" onClick={load}>
                    <i className="fa-solid fa-magnifying-glass me-2"></i> Buscar
                  </button>
                </div>
              </div>

              <hr className="my-3" />

              <div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span className="fw-semibold">Colunas:</span>
                  <button
                    className={`btn btn-sm ${allOn ? "btn-success" : "btn-outline-light"}`}
                    onClick={toggleAllCols}
                  >
                    {allOn ? "Todas ativas" : "Ativar todas"}
                  </button>
                  {ALL_COLUMNS.map(c => (
                    <label key={c.key} className="btn btn-sm btn-outline-light m-0">
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={visibleCols.includes(c.key)}
                        onChange={() => toggleCol(c.key)}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabela */}
      <section className="chart-card p-3" style={{ background: cardBg, border: `1px solid ${cardBor}`, borderRadius: 16 }}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="small">
            {range?.from && range?.to ? (
              <>
                <strong>Período:</strong>{" "}
                {startOfDaySP(range.from).toLocaleDateString("pt-BR", { timeZone: TZ })} —{" "}
                {endOfDaySP(range.to).toLocaleDateString("pt-BR", { timeZone: TZ })}
              </>
            ) : (
              <span className="text-muted">Selecione um período</span>
            )}
          </div>
          <div className="small">
            {rows.length > 0 ? <span><strong>{rows.length}</strong> registros</span> : <span className="text-muted">Sem dados</span>}
          </div>
        </div>

        <div className="table-responsive" style={{ maxHeight: 600, overflow: "auto" }}>
          {loading && <div className="text-muted p-2">Carregando…</div>}
          {err && <div className="text-warning p-2">Erro: {err}</div>}

          {!loading && !err && (
            <table className="table table-sm align-middle">
              <thead className="table-light" style={{ position: "sticky", top: 0 }}>
                <tr>
                  {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(c => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).length === 0 && (
                  <tr><td colSpan={visibleCols.length} className="text-center text-muted py-4">Sem registros no período.</td></tr>
                )}
                {(rows ?? []).map(r => (
                  <tr key={r._id}>
                    {visibleCols.includes("deviceId") && <td>{r.deviceId}</td>}
                    {visibleCols.includes("temperature") && <td>{r.temperature ?? "—"}</td>}
                    {visibleCols.includes("humidity") && <td>{r.humidity ?? "—"}</td>}
                    {visibleCols.includes("pressure") && <td>{r.pressure ?? "—"}</td>}
                    {visibleCols.includes("rain_mm2") && <td>{r.rain_mm2 ?? "—"}</td>}
                    {visibleCols.includes("wind_ms") && <td>{r.wind_ms ?? "—"}</td>}
                    {visibleCols.includes("ts") && <td>
                      <div className="fw-semibold">{fmtLocal(r.ts)}</div>
                      <div className="small text-muted">{r.ts}</div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}