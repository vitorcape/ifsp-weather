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
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${LAT}&longitude=${LON}` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
    `&timezone=${encodeURIComponent(TZ)}` +
    `&start_date=${day}&end_date=${day}`; // só hoje
  // Para incluir os próximos 6 dias, calcule end_date
  const end = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  end.setDate(end.getDate() + 6);
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");
  const endYMD = `${y}-${m}-${d}`;

  const fullUrl = url.replace(/end_date=[^&]+/, `end_date=${endYMD}`);

  const resp = await fetch(fullUrl, { next: { revalidate: 300 } });
  if (!resp.ok) return NextResponse.json({ error: "forecast fetch failed" }, { status: 502 });

  const json = await resp.json();
  // json.daily: { time: [...], temperature_2m_max: [...], temperature_2m_min: [...], weathercode: [...] }
  const days: Array<{
    date: string;
    tMax: number | null;
    tMin: number | null;
    weathercode: number | null;
  }> = json.daily.time.map((date: string, i: number) => ({
    date,
    tMax: Number.isFinite(json.daily.temperature_2m_max[i]) ? json.daily.temperature_2m_max[i] : null,
    tMin: Number.isFinite(json.daily.temperature_2m_min[i]) ? json.daily.temperature_2m_min[i] : null,
    weathercode: Number.isFinite(json.daily.weathercode[i]) ? json.daily.weathercode[i] : null,
  }));

  return NextResponse.json({ days });
}