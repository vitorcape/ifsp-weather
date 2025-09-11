// src/components/ChartCard.tsx
import { PropsWithChildren, ReactNode } from "react";

export default function ChartCard({
  title,
  icon,
  badge,
  children,
}: PropsWithChildren<{ title: string; icon?: ReactNode; badge?: ReactNode }>) {
  return (
    <div className="chart-card h-100">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="chart-title h5 mb-0">
          {icon} <span>{title}</span>
        </div>
        {badge ? <span className="chart-badge">{badge}</span> : null}
      </div>
      {children}
    </div>
  );
}