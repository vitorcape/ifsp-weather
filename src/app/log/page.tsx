// src/app/log/page.tsx

import LogTable from "@/components/LogTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function LogPage() {
  return (
    <div className="container-fluid py-4">
      <h1 className="display-5 fw-bold mb-4">
        <i className="fa-solid fa-list me-2"></i>Log de Leituras
      </h1>
      <LogTable refreshMs={30000} />
    </div>
  );
}