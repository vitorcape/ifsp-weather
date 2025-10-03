"use client";

import { useMemo, useState } from "react";
import ForecastCompareChart from "@/components/ForecastCompareChart";

const TZ = "America/Sao_Paulo";

function todayYMD(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toSP(d: Date) {
  return new Date(new Date(d).toLocaleString("en-US", { timeZone: TZ }));
}
function startOfDaySP(d: Date) { const x = toSP(d); x.setHours(0,0,0,0); return x; }
function endOfDaySP(d: Date)   { const x = toSP(d); x.setHours(23,59,59,999); return x; }

export default function CompareControls() {
  const [dateYMD, setDateYMD] = useState<string>(todayYMD());

  // calcula from/to em SP para o mesmo dia selecionado
  const { fromISO, toISO } = useMemo(() => {
    const base = new Date(`${dateYMD}T00:00:00-03:00`);
    const from = startOfDaySP(base).toISOString();
    const to   = endOfDaySP(base).toISOString();
    return { fromISO: from, toISO: to };
  }, [dateYMD]);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Comparativo (Previsão × Medido)</h3>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        <input
          type="date"
          className="form-control"
          style={{ maxWidth: 180 }}
          value={dateYMD}
          onChange={(e) => setDateYMD(e.target.value)}
          max={todayYMD()}
        />
      </div>

      <div className="mt-1 mb-4">
        <div className="fs-6">Fuso: America/São Paulo</div>
      </div>

      <ForecastCompareChart
        deviceId="esp32-001"
        refreshMs={60_000}
        dateYMD={dateYMD}     // continua indo para a parte da previsão
      />
    </div>
  );
}