// src/app/api/forecast/route.ts
import { NextResponse } from "next/server";

const LAT = -21.1383;      // Catanduva
const LON = -48.9738;
const TZ = "America/Sao_Paulo";

function todayYMD() {
  const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const y = nowSP.getFullYear();
  const m = String(nowSP.getMonth() + 1).padStart(2, "0");
  const d = String(nowSP.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET() {
  const day = todayYMD();

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&hourly=temperature_2m,relative_humidity_2m&timezone=${encodeURIComponent(TZ)}` +
    `&start_date=${day}&end_date=${day}`;

  const resp = await fetch(url, { next: { revalidate: 300 } });
  if (!resp.ok) return NextResponse.json({ error: "forecast fetch failed" }, { status: 502 });

  const json = await resp.json();
  const hours: string[] = json?.hourly?.time ?? []; // ex: "2025-08-23T01:00"
  const temps: number[] = json?.hourly?.temperature_2m ?? [];
  const hums: number[] = json?.hourly?.relative_humidity_2m ?? [];

  const items = hours.map((iso: string, i: number) => {
    const hh = iso.slice(11, 13);          // pega "HH" direto da string local
    const label = `${hh}:00`;              // "HH:00"
    return {
      iso,
      hourLabel: label,
      temperature: Number.isFinite(temps[i]) ? temps[i] : null,
      humidity: Number.isFinite(hums[i]) ? hums[i] : null,
    };
  });

  return NextResponse.json({ day, items });
}