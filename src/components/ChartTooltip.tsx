// src/components/ChartTooltip.tsx
"use client";

/**
 * Tipos simples para evitar conflito com os generics do Recharts.
 * Isso funciona bem para o caso comum de tooltip com 1–2 séries.
 */
type PayloadItem = {
    color?: string;
    name?: string | number;
    value?: number | string;
};

type SimpleTooltipProps = {
    active?: boolean;
    payload?: PayloadItem[];
    label?: string | number;
    unit?: string;
};

export default function ChartTooltip({
    active,
    payload,
    label,
    unit = "",
}: SimpleTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="tooltip-glass">
            <div className="fw-bold mb-1">{label}</div>
            {payload.map((p, i) => {
                const name = (p?.name ?? "") as string | number;
                const v = p?.value;
                const text = typeof v === "number" ? v.toFixed(1) : (v ?? "");

                return (
                    // força texto escuro independente da cor da série
                    <div key={i} style={{ color: "#102a5b" }}>
                        {name}: {text}{unit}
                    </div>
                );
            })}
        </div>
    );
}