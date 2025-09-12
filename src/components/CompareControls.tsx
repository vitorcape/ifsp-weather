"use client";

import { useState } from "react";
import ForecastCompareChart from "@/components/ForecastCompareChart";

function TodayYMD(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CompareControls() {
  const [dateYMD, setDateYMD] = useState<string>(TodayYMD());

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">
          Comparativo (Previsão × Medido)
        </h3>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        <input
          type="date"
          className="form-control"
          style={{ maxWidth: 180 }}
          value={dateYMD}
          onChange={(e) => setDateYMD(e.target.value)}
        />
        
      </div>
      <div className="mt-1 mb-4"><div className="fs-6">Fuso: America/São Paulo</div></div>

      <ForecastCompareChart
        deviceId="esp32-001"
        refreshMs={60_000}
        dateYMD={dateYMD}
      />
    </div>
  );
}