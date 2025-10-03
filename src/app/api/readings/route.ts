// src/app/api/readings/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Reading = {
  _id?: string;
  deviceId: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  rain_mm2: number | null;
  wind_ms: number | null;
  ts: string; // ISO
};

type ApiListResponse = Reading[] | { items: Reading[] };

function isReading(obj: unknown): obj is Reading {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  // validações mínimas
  return typeof o.deviceId === "string" && typeof o.ts === "string";
}

function toReadingPartial(obj: unknown): Partial<Reading> {
  if (typeof obj !== "object" || obj === null) return {};
  const o = obj as Record<string, unknown>;
  const pickNumberOrNull = (v: unknown) =>
    typeof v === "number" || v === null ? v : undefined;

  return {
    deviceId: typeof o.deviceId === "string" ? o.deviceId : undefined,
    temperature: pickNumberOrNull(o.temperature),
    humidity: pickNumberOrNull(o.humidity),
    pressure: pickNumberOrNull(o.pressure),
    rain_mm2: pickNumberOrNull(o.rain_mm2),
    wind_ms: pickNumberOrNull(o.wind_ms),
    ts: typeof o.ts === "string" ? o.ts : undefined,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const deviceId = searchParams.get("deviceId") || undefined;

  const db = await getDb();
  const coll = db.collection("readings");

  const query: Record<string, unknown> = {};
  if (from || to) {
    query.ts = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }
  if (deviceId) query.deviceId = deviceId;

  const items = (await coll
    .find(query, { projection: { _id: 1, deviceId: 1, temperature: 1, humidity: 1, pressure: 1, rain_mm2: 1, wind_ms: 1, ts: 1 } })
    .sort({ ts: -1 })
    .toArray()) as unknown as Reading[];

  // devolva SEMPRE array puro ou objeto {items}, mas seja consistente com seus componentes
  return NextResponse.json({ items } satisfies ApiListResponse, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const payloadUnknown: unknown = await req.json();
  const partial = toReadingPartial(payloadUnknown);

  if (!partial.deviceId || !partial.ts) {
    return NextResponse.json(
      { error: "deviceId e ts são obrigatórios" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const coll = db.collection("readings");
  const insertRes = await coll.insertOne({
    deviceId: partial.deviceId,
    temperature: partial.temperature ?? null,
    humidity: partial.humidity ?? null,
    pressure: partial.pressure ?? null,
    rain_mm2: partial.rain_mm2 ?? null,
    wind_ms: partial.wind_ms ?? null,
    ts: new Date(partial.ts),
  });

  return NextResponse.json({ _id: String(insertRes.insertedId) });
}
