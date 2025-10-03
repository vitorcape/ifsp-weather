// src/app/api/readings/[id]/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

type ReadingUpdate = {
  deviceId?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  rain_mm2?: number | null;
  wind_ms?: number | null;
  ts?: string | null; // ISO
};

function sanitizeUpdate(o: unknown): ReadingUpdate {
  if (typeof o !== "object" || o === null) return {};
  const a = o as Record<string, unknown>;

  const ensureNumOrNull = (v: unknown) =>
    typeof v === "number" || v === null ? v : undefined;

  return {
    deviceId: typeof a.deviceId === "string" ? a.deviceId : a.deviceId === null ? null : undefined,
    temperature: ensureNumOrNull(a.temperature),
    humidity: ensureNumOrNull(a.humidity),
    pressure: ensureNumOrNull(a.pressure),
    rain_mm2: ensureNumOrNull(a.rain_mm2),
    wind_ms: ensureNumOrNull(a.wind_ms),
    ts: typeof a.ts === "string" ? a.ts : a.ts === null ? null : undefined,
  };
}

export async function PATCH(req: Request, { params }: Params) {
  const id = params.id;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const bodyUnknown: unknown = await req.json();
  const upd = sanitizeUpdate(bodyUnknown);

  const $set: Record<string, unknown> = {};
  if (upd.deviceId !== undefined) $set.deviceId = upd.deviceId;
  if (upd.temperature !== undefined) $set.temperature = upd.temperature;
  if (upd.humidity !== undefined) $set.humidity = upd.humidity;
  if (upd.pressure !== undefined) $set.pressure = upd.pressure;
  if (upd.rain_mm2 !== undefined) $set.rain_mm2 = upd.rain_mm2;
  if (upd.wind_ms !== undefined) $set.wind_ms = upd.wind_ms;
  if (upd.ts !== undefined) $set.ts = upd.ts ? new Date(upd.ts) : null;

  if (Object.keys($set).length === 0) {
    return NextResponse.json({ ok: true, modified: 0 });
  }

  const db = await getDb();
  const coll = db.collection("readings");
  const res = await coll.updateOne({ _id: new ObjectId(id) }, { $set });

  return NextResponse.json({ ok: true, modified: res.modifiedCount });
}

export async function DELETE(_req: Request, { params }: Params) {
  const id = params.id;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const db = await getDb();
  const coll = db.collection("readings");
  const res = await coll.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true, deleted: res.deletedCount });
}
