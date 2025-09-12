// src/app/api/readings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("deviceId") ?? undefined;
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const limit = Number(searchParams.get("limit") ?? 500);

  const query: Record<string, unknown> = {};
  if (deviceId) query.deviceId = deviceId;

  if (since || until) {
    const range: Record<string, Date> = {};
    if (since) range.$gte = new Date(since);
    if (until) range.$lt  = new Date(until);
    query.ts = range;
  }

  const db = await getDb();
  // Decide sort order: for a single latest reading, sort desc; otherwise asc
  const sortOrder = limit === 1 ? { ts: -1 } : { ts: 1 };
  const cursor = db
  .collection("readings")
  .find(query)
  .sort([["ts", limit === 1 ? -1 : 1]]) //  [[campo, direção]]
  .limit(limit);

  const docs = await cursor.toArray();

  let records = docs;
  // If fetching single latest reading, return that record only
  if (limit === 1) {
    records = docs; // already contains only the newest
  }

  return NextResponse.json(
    records.map(d => ({
      deviceId: d.deviceId as string,
      temperature: Number(d.temperature),
      humidity:    Number(d.humidity),
      pressure:    Number(d.pressure),
      rain_mm2:    Number(d.rain_mm2),
      wind_ms:     Number(d.wind_ms),
      ts:          (d.ts as Date).toISOString(),
    })),
    { headers: { "Cache-Control": "no-store" } }
  );
}