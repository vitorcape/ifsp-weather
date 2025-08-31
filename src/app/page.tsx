// src/app/page.tsx
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

type Reading = {
  _id?: string;
  deviceId: string;
  temperature: number;
  temperature_bmp: number;
  humidity: number;
  pressure: number;
  rain_mm2: number;
  rain_count: number;
  wind_ms: number;
  ts: Date;
};

export default async function Home() {
  const db = await getDb();
  const readings = await db
    .collection<Reading>("readings")
    .find({})
    .sort({ ts: -1 })
    .limit(10)
    .toArray();

  return (
    <main className="p-6">
      <h1>Leituras do ESP32</h1>
      <ul>
        {readings.map((r: any, i: number) => (
          <li key={i}>
            {new Date(r.ts).toLocaleString()} — {r.deviceId} — {r.temperature.toFixed(1)}°C /{" "} — {r.temperature_bmp.toFixed(1)}°C /{" "} — {r.humidity} — {r.pressure} — {r.rain_mm2} — {r.rain_count} — {r.wind_ms}
            {r.humidity.toFixed(0)}%
          </li>
        ))}
      </ul>
    </main>
  );
}