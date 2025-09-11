// src/app/api/home-summary/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSunInfo } from "@/lib/sun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";

function startOfTodaySP(): Date {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  now.setHours(0, 0, 0, 0);
  return new Date(now.toLocaleString("en-US", { timeZone: TZ }));
}
function parseHM(isoLocal: string) {
  const [h, m] = isoLocal.slice(11, 16).split(":").map(Number);
  return { h, m };
}
function toMinutes(h: number, m: number) {
  return h * 60 + m;
}

export async function GET() {
  try {
    const db = await getDb();
    const coll = db.collection("readings");

    // ---- último registro (serializado) ----
    const lastDoc = await coll
      .find({}, { projection: { _id: 0, deviceId: 1, temperature: 1, humidity: 1, pressure: 1, rain_mm2: 1, wind_ms: 1, ts: 1 } })
      .sort({ ts: -1 })
      .limit(1)
      .next();

    const last = lastDoc
      ? {
          deviceId: String(lastDoc.deviceId),
          temperature: Number(lastDoc.temperature),
          humidity: Number(lastDoc.humidity),
          pressure: Number(lastDoc.pressure),
          rain_mm2: Number(lastDoc.rain_mm2),
          wind_ms: Number(lastDoc.wind_ms),
          ts: new Date(lastDoc.ts).toISOString(), // seguro para JSON
        }
      : null;

    // ---- stats do dia ----
    const since = startOfTodaySP();
    const statsAgg = await coll
      .aggregate([
        { $match: { ts: { $gte: since } } },
        {
          $group: {
            _id: null,
            tMin: { $min: "$temperature" },
            tMax: { $max: "$temperature" },
            hMin: { $min: "$humidity" },
            hMax: { $max: "$humidity" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const stats = statsAgg[0] ?? { tMin: null, tMax: null, hMin: null, hMax: null, count: 0 };

    // ---- nascer/pôr do sol (strings locais "YYYY-MM-DDTHH:MM") ----
    const sun = await getSunInfo();
    const sunriseLabel = sun.sunrise.slice(11, 16);
    const sunsetLabel = sun.sunset.slice(11, 16);

    // dia/noite
    const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
    const nowMin = toMinutes(nowSP.getHours(), nowSP.getMinutes());
    const { h: sh, m: sm } = parseHM(sun.sunrise);
    const { h: eh, m: em } = parseHM(sun.sunset);
    const isDay = nowMin >= toMinutes(sh, sm) && nowMin < toMinutes(eh, em);

    return NextResponse.json(
      { last, stats, sunriseLabel, sunsetLabel, isDay, nowISO: nowSP.toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[home-summary] error:", err);
    return NextResponse.json({ error: "home-summary failed" }, { status: 500 });
  }
}