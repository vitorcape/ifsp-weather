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

    // 🔎 Trunca o timestamp para o dia (fuso SP) e agrega estatísticas do dia
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

            // já existiam
            tMin: { $min: "$temperature" },
            tMax: { $max: "$temperature" },
            hAvg: { $avg: "$humidity" },
            count: { $sum: 1 },

            // ✅ novos campos (ajuste os nomes se no seu documento forem diferentes)
            pAvg: { $avg: "$pressure" },     // pressão média (Pa)
            rainMm: { $sum: "$rain_mm2" },   // chuva acumulada (mm) — se sua coluna já for mm
            windAvg: { $avg: "$wind_ms" },   // vento médio (km/h)
            windMax: { $max: "$wind_ms" },   // rajada máxima (km/h)
          },
        },
        // deixa números com 2 casas onde faz sentido (sem alterar nulos)
        {
          $project: {
            _id: 0,
            tMin: 1,
            tMax: 1,
            hAvg: 1,
            count: 1,
            pAvg: 1,
            rainMm: 1,
            windAvg: 1,
            windMax: 1,
          },
        },
      ])
      .toArray();

    const stats =
      (agg[0] as {
        tMin: number | null;
        tMax: number | null;
        hAvg: number | null;
        count: number;

        pAvg?: number | null;
        rainMm?: number | null;
        windAvg?: number | null;
        windMax?: number | null;
      }) ??
      ({
        tMin: null,
        tMax: null,
        hAvg: null,
        count: 0,
        pAvg: null,
        rainMm: null,
        windAvg: null,
        windMax: null,
      } as const);

    // ☀️/🌙 via Open-Meteo para a MESMA data
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