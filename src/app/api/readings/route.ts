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

// GET /api/readings?from=...&to=...&deviceId=...&limit=...&as=object|array
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const fromISO = searchParams.get("from");
    const toISO = searchParams.get("to");
    const deviceId = searchParams.get("deviceId")?.trim();
    const limit = Math.max(1, Math.min(5000, Number(searchParams.get("limit") ?? 500)));
    const as = (searchParams.get("as") || "array").toLowerCase(); // 🔁 compat: padrão "array"

    const q: Record<string, unknown> = {};
    if (fromISO || toISO) {
      q.ts = {};
      if (fromISO) (q.ts as Record<string, Date>).$gte = new Date(fromISO);
      if (toISO) (q.ts as Record<string, Date>).$lte = new Date(toISO);
    }
    if (deviceId) q.deviceId = deviceId;

    const db = await getDb();
    const coll = db.collection("readings");

    const cursor = coll
      .find(q)
      .sort({ ts: -1 })
      .limit(limit);

    const items = await cursor.toArray();

    // 🔁 Retrocompatibilidade:
    // - padrão: retorna array (o que sua página de Gráficos espera)
    // - se ?as=object => retorna { items }
    if (as === "object") {
      return NextResponse.json(
        { items },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    // default: array
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "readings GET failed" },
      { status: 500 }
    );
  }
}

// POST /api/readings
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as Partial<{
      deviceId: string;
      temperature: number | null;
      humidity: number | null;
      pressure: number | null;
      rain_mm2: number | null;
      wind_ms: number | null;
      ts: string;
    }>;

    const doc: Record<string, unknown> = {
      deviceId: payload.deviceId ?? "",
      temperature: payload.temperature ?? null,
      humidity: payload.humidity ?? null,
      pressure: payload.pressure ?? null,
      rain_mm2: payload.rain_mm2 ?? null,
      wind_ms: payload.wind_ms ?? null,
      ts: payload.ts ? new Date(payload.ts) : new Date(),
    };

    const db = await getDb();
    const coll = db.collection("readings");
    const res = await coll.insertOne(doc);

    return NextResponse.json(
      { ok: true, _id: (res.insertedId as ObjectId).toString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "readings POST failed" },
      { status: 500 }
    );
  }
}