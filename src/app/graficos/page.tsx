// src/app/graph/page.tsx

import DataCards from "@/components/DataCards";
import UnifiedChart from "@/components/UnifiedChart";
import CompareControls from "@/components/CompareControls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ChartsPage() {
  return (
    <div className="container-fluid py-4">
      <section className="card-glass mb-3">
        <h2 className="m-0"><i className="fa-solid fa-chart-simple"></i> Gráficos</h2>
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <span className="chart-legend fw-normal mt-2">Selecione uma data para exibir informações</span>
        </div>
      </section>

      {/* Primeira seção: dados e gráfico unificado */}
      <div className="row g-4 mb-5">
        <div className="col-12">
          <div className="card-glass p-4">
            <DataCards />
            <UnifiedChart />
            <div className="mt-3">
              <CompareControls />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}