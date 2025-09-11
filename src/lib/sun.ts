// src/lib/sun.ts
export type SunInfo = {
  sunrise: string; // ISO string
  sunset: string;  // ISO string
};

const LAT = -21.1383; // Catanduva
const LON = -48.9738;
const TZ = "America/Sao_Paulo";

export async function getSunInfo(): Promise<SunInfo> {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const day = `${y}-${m}-${d}`;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=sunrise,sunset&timezone=${TZ}&start_date=${day}&end_date=${day}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error("Falha ao buscar sunrise/sunset");

  const json = await resp.json();
  return {
    sunrise: json.daily.sunrise[0],
    sunset: json.daily.sunset[0],
  };
}

export async function getSunInfoFor(dayISO: string): Promise<SunInfo> {
  // dayISO: "YYYY-MM-DD" (data em SP)
  const LAT = -21.1383; // Catanduva
  const LON = -48.9738;
  const TZ = "America/Sao_Paulo";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=sunrise,sunset&timezone=${TZ}&start_date=${dayISO}&end_date=${dayISO}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error("Falha ao buscar sunrise/sunset");
  const json = await resp.json();
  return {
    sunrise: json.daily.sunrise[0], // "YYYY-MM-DDTHH:MM"
    sunset: json.daily.sunset[0],
  };
}