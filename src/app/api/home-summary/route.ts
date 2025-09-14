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

function last24HoursSP(): Date {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  now.setHours(now.getHours() - 24);
  return new Date(now.toLocaleString("en-US", { timeZone: TZ }));
}

function parseHM(isoLocal: string) {
  const [h, m] = isoLocal.slice(11, 16).split(":").map(Number);
  return { h, m };
}
function toMinutes(h: number, m: number) { return h * 60 + m; }

function nowInSP(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

export async function GET(_req: Request) {
  try {
    const db = await getDb();
    const coll = db.collection("readings");

    // último registro
    const lastDoc = await coll
      .find({}, { projection: { _id: 0, deviceId: 1, temperature: 1, humidity: 1, pressure: 1, rain_mm2: 1, wind_ms: 1, ts: 1 } })
      .sort({ ts: -1 })
      .limit(1)
      .next();

    const last = lastDoc ? {
      deviceId: String(lastDoc.deviceId),
      temperature: Number(lastDoc.temperature),
      humidity: Number(lastDoc.humidity),
      pressure: Number(lastDoc.pressure),
      rain_mm2: Number(lastDoc.rain_mm2),
      wind_ms: Number(lastDoc.wind_ms),
      ts: new Date(lastDoc.ts).toISOString(),
    } : null;

    // stats do dia
    const since = startOfTodaySP();
    const statsAgg = await coll.aggregate([
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
    ]).toArray();
    const stats = statsAgg[0] ?? { tMin: null, tMax: null, hMin: null, hMax: null, count: 0 };

    // vento últimas 24h
    const since24h = last24HoursSP();
    const windSumAgg = await coll.aggregate([
      { $match: { ts: { $gte: since24h } } },
      {
        $group: {
          _id: null,
          totalWind: { $sum: "$wind_ms" },
          windCount: { $sum: 1 },
          avgWind: { $avg: "$wind_ms" },
        },
      },
    ]).toArray();
    const windStats = windSumAgg[0] ?? { totalWind: 0, windCount: 0, avgWind: 0 };

    // nascer/pôr do sol
    const sun = await getSunInfo();
    const sunriseLabel = sun.sunrise;
    const sunsetLabel = sun.sunset;

    // dia/noite
    const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
    const nowMin = toMinutes(nowSP.getHours(), nowSP.getMinutes());
    const { h: sh, m: sm } = parseHM(sun.sunrise);
    const { h: eh, m: em } = parseHM(sun.sunset);
    const isDay = nowMin >= toMinutes(sh, sm) && nowMin < toMinutes(eh, em);

    // chuva 24h
    const endSP = nowInSP();
    const startSP = new Date(endSP.getTime() - 24 * 60 * 60 * 1000);
    const rainAgg = await coll.aggregate([
      { $match: { ts: { $gte: startSP, $lte: endSP }, rain_mm2: { $ne: null } } },
      { $group: { _id: null, rainLast24h: { $sum: "$rain_mm2" } } },
    ]).toArray();
    const rainLast24h = rainAgg[0]?.rainLast24h ?? 0;

    return NextResponse.json(
      {
        last,
        stats,
        windStats,
        sunriseLabel,
        sunsetLabel,
        isDay,
        rainLast24h,
        nowISO: nowSP.toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[home-summary] error:", err);
    return NextResponse.json({ error: "home-summary failed" }, { status: 500 });
  }
}