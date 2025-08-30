// app/api/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// Garanta runtime Node.js para usar o driver do Mongo
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.DEVICE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: any;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId, temperature, temperature_bmp, humidity, ts, pressure, rain_mm2, rain_count, wind_ms } = data;

  if (typeof temperature !== "number" || typeof temperature_bmp !== "number" || typeof humidity !== "number") {
    return NextResponse.json({ error: "temperature/humidity devem ser números" }, { status: 422 });
  }

  const doc = {
    deviceId: deviceId || "esp32-001",
    temperature,
    temperature_bmp,
    humidity,
    pressure,
    rain_mm2,
    rain_count,
    wind_ms,
    ts: ts ? new Date(ts) : new Date(),
  };

  const db = await getDb();
  await db.collection("readings").insertOne(doc);

  return NextResponse.json({ ok: true });
}