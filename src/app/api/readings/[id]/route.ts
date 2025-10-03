import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

function isPromise<T>(x: unknown): x is Promise<T> {
  return typeof x === "object" && x !== null && "then" in (x as object);
}

async function getIdFromContext(ctx: RouteContext): Promise<string> {
  const raw = (ctx as RouteContext).params as unknown;
  if (isPromise<{ id: string }>(raw)) {
    const p = await raw;
    return p.id;
  }
  return (raw as { id: string }).id;
}

function isAuthorized(req: NextRequest): boolean {
  const headerToken = req.headers.get("x-admin-token") ?? "";
  const serverToken =
    process.env.ADMIN_TOKEN ??
    process.env.NEXT_PUBLIC_ADMIN_TOKEN ??
    "";
  return !!serverToken && headerToken === serverToken;
}

// GET /api/readings/[id]
export async function GET(
  _req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const id = await getIdFromContext(ctx);
    const db = await getDb();
    const coll = db.collection("readings");
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(doc, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: "readings/[id] GET failed" },
      { status: 500 }
    );
  }
}

// PATCH /api/readings/[id]
export async function PATCH(
  req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const id = await getIdFromContext(ctx);
    const body = (await req.json()) as Partial<{
      deviceId: string | null;
      temperature: number | null;
      humidity: number | null;
      pressure: number | null;
      rain_mm2: number | null;
      wind_ms: number | null;
      ts: string | null;
    }>;

    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined) continue;
      update[k] = v;
    }

    const db = await getDb();
    const coll = db.collection("readings");
    const res = await coll.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    return NextResponse.json(
      { ok: true, modified: res.modifiedCount },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "readings/[id] PATCH failed" },
      { status: 500 }
    );
  }
}

// DELETE /api/readings/[id]
export async function DELETE(
  req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const id = await getIdFromContext(ctx);
    const db = await getDb();
    const coll = db.collection("readings");
    const res = await coll.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      { ok: true, deleted: res.deletedCount },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "readings/[id] DELETE failed" },
      { status: 500 }
    );
  }
}