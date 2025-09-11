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

/** Constrói um Date estável da meia-noite local (SP) para comparação/labels */
function dateFromYMD_SP(ymd: string): Date {
  // Força offset -03:00/-02:00 não importando o servidor
  return new Date(`${ymd}T00:00:00-03:00`);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let dateStr = searchParams.get("date") || "";
    if (!isYMD(dateStr)) {
      // default: hoje em SP
      const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
      const y = nowSP.getFullYear();
      const m = String(nowSP.getMonth() + 1).padStart(2, "0");
      const d = String(nowSP.getDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${d}`;
    }

    const db = await getDb();
    const coll = db.collection("readings");

    // 💡 TZ direto no Mongo: trunca o timestamp para o dia em SP e compara com a data passada
    const targetMidnightSP = dateFromYMD_SP(dateStr);
    const agg = await coll
      .aggregate([
        {
          $match: {
            $expr: {
              $eq: [
                {
                  $dateTrunc: {
                    date: "$ts",
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
          },
        },
      ])
      .toArray();

    const stats =
      agg[0] ?? ({ tMin: null, tMax: null, hAvg: null, count: 0 } as {
        tMin: number | null;
        tMax: number | null;
        hAvg: number | null;
        count: number;
      });

    // ☀️/🌙 via Open‑Meteo para a MESMA data
    const sun = await getSunInfoFor(dateStr);
    const sunriseLabel = sun.sunrise.slice(11, 16); // "HH:MM"
    const sunsetLabel = sun.sunset.slice(11, 16);

    // Nome do dia (segunda, terça...) em pt-BR
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
  } catch (e) {
    console.error("[day-summary]", e);
    return NextResponse.json({ error: "day-summary failed" }, { status: 500 });
  }
}