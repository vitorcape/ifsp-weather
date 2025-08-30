// app/page.tsx
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export default async function Home() {
  const db = await getDb();
  const readings = await db
    .collection("readings")
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