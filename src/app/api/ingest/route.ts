// src/app/api/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

type IngestBody = {
  deviceId?: string;
  temperature_dht: number;
  temperature: number;
  humidity: number;
  pressure: number;
  rain_mm2: number;
  rain_count: number;
  wind_ms: number;
  ts?: string | number | Date;
};

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.DEVICE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as IngestBody;

  if (typeof body.temperature !== "number" || typeof body.humidity !== "number") {
    return NextResponse.json({ error: "temperature/humidity devem ser números" }, { status: 422 });
  }

  const doc = {
    deviceId: body.deviceId ?? "esp32-001",
    temperature_dht: body.temperature_dht,
    temperature: body.temperature,
    humidity: body.humidity,
    pressure: body.pressure,
    rain_mm2: body.rain_mm2,
    wind_ms: body.wind_ms,
    ts: body.ts ? new Date(body.ts) : new Date(),
  };

  const db = await getDb();
  await db.collection("readings").insertOne(doc);

  return NextResponse.json({ ok: true });
}