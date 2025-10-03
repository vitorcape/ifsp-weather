// src/app/api/day-summary/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSunInfoFor } from "@/lib/sun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";

/** Valida "YYYY-MM-DD" */
function isYMD(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Constrói um Date estável da meia-noite local (SP) */
function dateFromYMD_SP(ymd: string): Date {
  return new Date(`${ymd}T00:00:00-03:00`); // força fuso SP
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let dateStr = searchParams.get("date") || "";

    if (!isYMD(dateStr)) {
      // default: hoje SP
      const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
      const y = nowSP.getFullYear();
      const m = String(nowSP.getMonth() + 1).padStart(2, "0");
      const d = String(nowSP.getDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${d}`;
    }

    const db = await getDb();
    const coll = db.collection("readings");

    const targetMidnightSP = dateFromYMD_SP(dateStr);

    // 🔎 Agregação por dia no fuso SP
    const agg = await coll.aggregate([
  {
    // converte ts para Date (funciona mesmo se já for Date)
    $addFields: {
      tsDate: { $toDate: "$ts" }
    }
  },
  {
    $match: {
      $expr: {
        $eq: [
          {
            $dateTrunc: {
              date: "$tsDate",
              unit: "day",
              timezone: TZ,
            },
          },
          targetMidnightSP,
        ],
      },
    },
  },
  {
    $group: {
      _id: null,
      tMin: { $min: "$temperature" },
      tMax: { $max: "$temperature" },
      hAvg: { $avg: "$humidity" },
      count: { $sum: 1 },
      pAvg: { $avg: "$pressure" },
      rainMm: { $sum: "$rain_mm2" },
      windAvg: { $avg: "$wind_ms" },
      windMax: { $max: "$wind_ms" },
    },
  },
  { $project: { _id: 0 } },
]).toArray();

    const stats = agg[0] || {
      tMin: null,
      tMax: null,
      hAvg: null,
      count: 0,
      pAvg: null,
      rainMm: null,
      windAvg: null,
      windMax: null,
    };

    // ☀️/🌙 nascer/pôr-do-sol
    let sunriseLabel = "—:—";
    let sunsetLabel = "—:—";
    try {
      const sun = await getSunInfoFor(dateStr);
      sunriseLabel = sun.sunrise.slice(11, 16);
      sunsetLabel = sun.sunset.slice(11, 16);
    } catch (err) {
      console.warn("[day-summary] falha ao obter sun info:", err);
    }

    const weekday = new Date(targetMidnightSP).toLocaleDateString("pt-BR", {
      weekday: "long",
      timeZone: TZ,
    });

    return NextResponse.json(
      {
        day: dateStr,
        weekday,
        sunriseLabel,
        sunsetLabel,
        stats,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
  console.error("[day-summary] erro:", e?.stack || e);
  return NextResponse.json(
    { error: "day-summary failed", details: String(e?.message || e) },
    { status: 500 }
  );
}
}