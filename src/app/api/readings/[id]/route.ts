// src/app/api/readings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const headerToken = req.headers.get("x-admin-token") ?? "";
  const serverToken =
    process.env.ADMIN_TOKEN ??
    process.env.NEXT_PUBLIC_ADMIN_TOKEN ??
    "";
  return !!serverToken && headerToken === serverToken;
}

// PATCH
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }   // 👈 aqui ajustado
): Promise<NextResponse> {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;  // 👈 await no params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const payload = await req.json();
    const updateDoc: Record<string, unknown> = {};

    if ("deviceId" in payload) updateDoc.deviceId = payload.deviceId ?? "";
    if ("temperature" in payload) updateDoc.temperature = payload.temperature;
    if ("humidity" in payload) updateDoc.humidity = payload.humidity;
    if ("pressure" in payload) updateDoc.pressure = payload.pressure;
    if ("rain_mm2" in payload) updateDoc.rain_mm2 = payload.rain_mm2;
    if ("wind_ms" in payload) updateDoc.wind_ms = payload.wind_ms;
    if ("ts" in payload) updateDoc.ts = payload.ts ? new Date(payload.ts) : new Date();

    const db = await getDb();
    const coll = db.collection("readings");
    const res = await coll.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });

    return NextResponse.json({ ok: true, modified: res.modifiedCount });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }   // 👈 igual no DELETE
): Promise<NextResponse> {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection("readings");
    const res = await coll.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ ok: true, deleted: res.deletedCount });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}