"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

type DaySummary = {
    day: string;              // "YYYY-MM-DD"
    weekday: string;          // "segunda-feira"
    sunriseLabel: string;     // "HH:MM"
    sunsetLabel: string;      // "HH:MM"
    stats: { tMin: number | null; tMax: number | null; hAvg: number | null; count: number };
};

const TZ = "America/Sao_Paulo";

/** hoje no fuso de SP */
function todaySP(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}
/** Date -> "YYYY-MM-DD" no fuso de SP */
function toYMD_SP(d: Date): string {
    const x = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
}
/** "YYYY-MM-DD" -> "DD/MM/YYYY" */
function ymdToBR(ymd: string) {
    const [y, m, d] = ymd.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export default function CalendarView() {
    // estado: data selecionada (Date) e resumo retornado pela API
    const [selected, setSelected] = useState<Date>(todaySP());
    const [data, setData] = useState<DaySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const ymd = useMemo(() => toYMD_SP(selected), [selected]);
    const weekdayPretty = useMemo(() => {
        if (!data?.weekday) return "—";
        return data.weekday.charAt(0).toUpperCase() + data.weekday.slice(1);
    }, [data?.weekday]);

    // carrega resumo quando a data muda
    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const res = await fetch(`/api/day-summary?date=${encodeURIComponent(ymd)}`, { cache: "no-store" });
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`HTTP ${res.status} - ${text}`);
                }
                const json: DaySummary = await res.json();
                if (alive) setData(json);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                if (alive) setErr(msg);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [ymd]);

    return (
        <div className="row g-3">
            {/* Esquerda: calendário */}
            <div className="col-12 col-lg-6">
                <div className="chart-card p-3">
                    <DayPicker
                        mode="single"
                        locale={ptBR}
                        selected={selected}
                        onSelect={(d) => d && setSelected(d)}
                        weekStartsOn={1}
                        showOutsideDays
                        fromYear={2023}
                        toYear={2030}
                        captionLayout="dropdown"   // dropdown de mês/ano
                        disabled={{ after: todaySP() }} // evita datas futuras (opcional)
                    />
                    <div className="small text-muted">
                        Data selecionada: <span className="fw-semibold">{ymdToBR(ymd)}</span>
                    </div>
                </div>
            </div>

            {/* Direita: card de informações do dia */}
            <div className="col-12 col-lg-6">
                <div className="chart-card p-3 h-100">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <h2 className="h5 m-0">Informações do dia</h2>
                        <span className="chart-badge">{ymdToBR(ymd)}</span>
                    </div>

                    {loading && <div className="text-muted">Carregando…</div>}
                    {err && <div className="text-warning">Erro: {err}</div>}

                    {!loading && !err && (
                        <>
                            <div className="mb-2">
                                <i className="fa-solid fa-calendar-day me-2"></i>
                                <span className="fw-semibold">{weekdayPretty}</span>
                            </div>

                            <div className="row g-2">
                                <div className="col-6">
                                    <div className="p-2 rounded bg-light text-dark">
                                        <div className="small text-uppercase fw-semibold">Temp. Máxima</div>
                                        <div className="fs-4 fw-bold">{data?.stats.tMax != null ? `${data.stats.tMax.toFixed(1)}°C` : "—"}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-2 rounded bg-light text-dark">
                                        <div className="small text-uppercase fw-semibold">Temp. Mínima</div>
                                        <div className="fs-4 fw-bold">{data?.stats.tMin != null ? `${data.stats.tMin.toFixed(1)}°C` : "—"}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-2 rounded bg-light text-dark">
                                        <div className="small text-uppercase fw-semibold">Nascer do sol</div>
                                        <div className="fs-4 fw-bold">{data?.sunriseLabel ?? "—:—"}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-2 rounded bg-light text-dark">
                                        <div className="small text-uppercase fw-semibold">Pôr do sol</div>
                                        <div className="fs-4 fw-bold">{data?.sunsetLabel ?? "—:—"}</div>
                                    </div>
                                </div>
                                <div className="col-12">
                                    <div className="p-2 rounded bg-light text-dark">
                                        <div className="small text-uppercase fw-semibold">Umidade média</div>
                                        <div className="fs-4 fw-bold">{data?.stats.hAvg != null ? `${Math.round(data.stats.hAvg)}%` : "—"}</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}