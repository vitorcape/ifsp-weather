// src/components/ChartCard.tsx

import { PropsWithChildren, ReactNode } from "react";

export default function ChartCard({
  title,
  icon,
  badge,
  children,
}: PropsWithChildren<{ title: string; icon?: ReactNode; badge?: ReactNode }>) {
  return (
    <div className="card-glass p-4 h-100">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center">
          {icon}
          <h5 className="ms-2 mb-0">{title}</h5>
        </div>
        {badge && (
          <span className="badge bg-light text-dark py-1 px-2">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}