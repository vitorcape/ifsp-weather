"use client";

import { useEffect, useState } from "react";

export default function NowBadgeClient({ refreshMs = 30000 }: { refreshMs?: number }) {
  const [isDay, setIsDay] = useState<boolean | null>(null);
  const [temp, setTemp] = useState<string>("--°C");

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch("/api/home-summary", { cache: "no-store" });
      const json = await res.json();
      if (!alive) return;
      setIsDay(Boolean(json.isDay));
      setTemp(json?.last?.temperature != null ? `${json.last.temperature.toFixed(1)}°C` : "--°C");
    }
    load();
    const id = setInterval(load, refreshMs);
    return () => { alive = false; clearInterval(id); };
  }, [refreshMs]);

  const icon = isDay == null ? "fa-circle-notch fa-spin" : isDay ? "fa-sun" : "fa-moon";

  return (
    <span className="badge bg-light text-dark rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2">
      <i className={`fa-solid ${icon}`}></i>
      <span className="fw-semibold">{temp}</span>
    </span>
  );
}