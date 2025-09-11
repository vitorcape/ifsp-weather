"use client";

import { useState } from "react";
import ForecastCompareChart from "@/components/ForecastCompareChart";
import ChartCard from "@/components/ChartCard";

function TodayYMD(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CompareControls() {
  const [dateYMD, setDateYMD] = useState<string>(TodayYMD());

  return (
    <ChartCard
      title={`Comparativo (Previsão × Medido) — ${dateYMD.split("-").reverse().join("/")}`}
      icon={<i className="fa-solid fa-arrows-left-right-to-line" />}
      badge="1 hora"
    >
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <label className="form-label m-0 me-2">Data:</label>
        <input
          type="date"
          className="form-control"
          style={{ maxWidth: 180 }}
          value={dateYMD}
          onChange={(e) => setDateYMD(e.target.value)}
        />
        <small className="text-muted ms-2">Fuso: America/São Paulo</small>
      </div>

      <ForecastCompareChart deviceId="esp32-001" refreshMs={60_000} dateYMD={dateYMD} />
    </ChartCard>
  );
}