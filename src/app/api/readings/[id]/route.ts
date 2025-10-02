// src/app/api/readings/[id]/route.ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authOK(req: Request) {
  const tok = req.headers.get("x-admin-token");
  return !!tok && tok === process.env.ADMIN_TOKEN;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!authOK(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = params.id;
  const body = await req.json();

  const db = await getDb();
  const coll = db.collection("readings");

  const update: any = {};
  for (const k of ["deviceId", "temperature", "humidity", "pressure", "rain_mm2", "wind_ms", "ts"] as const) {
    if (k in body) update[k] = k === "ts" ? new Date(body[k]) : body[k];
  }

  await coll.updateOne({ _id: new ObjectId(id) }, { $set: update });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!authOK(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = params.id;

  const db = await getDb();
  const coll = db.collection("readings");
  await coll.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}