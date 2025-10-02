// src/app/api/readings/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const deviceId = searchParams.get("deviceId") || undefined;
  const limit = Number(searchParams.get("limit") || "500");
  const shape = searchParams.get("shape"); // "object" -> { items: [...] }, default -> array

  const db = await getDb();
  const coll = db.collection("readings");

  const q: Record<string, any> = {};
  if (from || to) {
    q.ts = {};
    if (from) q.ts.$gte = new Date(from);
    if (to) q.ts.$lte = new Date(to);
  }
  if (deviceId) q.deviceId = deviceId;

  const docs = await coll
    .find(q, {
      projection: {
        deviceId: 1,
        temperature: 1,
        humidity: 1,
        pressure: 1,
        rain_mm2: 1,
        wind_ms: 1,
        ts: 1,
      },
    })
    .sort({ ts: -1 })
    .limit(limit)
    .toArray();

  const rows = docs.map((d: any) => ({
    _id: String(d._id),
    deviceId: d.deviceId ?? "",
    temperature: d.temperature ?? null,
    humidity: d.humidity ?? null,
    pressure: d.pressure ?? null,
    rain_mm2: d.rain_mm2 ?? null,
    wind_ms: d.wind_ms ?? null,
    ts: new Date(d.ts).toISOString(),
  }));

  // ✅ Padrão: array (retrocompatível)
  // ✅ Opcional: ?shape=object -> { items: [...] }
  const body = shape === "object" ? { items: rows } : rows;

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}