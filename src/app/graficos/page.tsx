// src/app/graficos/page.tsx
import TempChart from "@/components/TempChart";
import HumidityChart from "@/components/HumidityChart";
import ChartCard from "@/components/ChartCard";
import CompareControls from "@/components/CompareControls";  // <--- novo client component

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ChartsPage() {
  return (
    <div className="container py-4">
      <section className="chart-card mb-4">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <h2 className="m-0"><i className="fa-solid fa-chart-simple"></i> Gráficos</h2>
          <span className="chart-legend">
            <i className="fa-solid fa-circle-info me-2"></i>
            Temperatura/Umidade (últimas 2h) • Comparativo por data
          </span>
        </div>
      </section>

      <section className="row g-3">
        <div className="col-12 col-lg-6">
          <ChartCard title="Temperatura — últimas 2 horas" icon={<i className="fa-solid fa-fire"></i>} badge="5 min">
            <TempChart deviceId="esp32-lab" intervalMs={15000} />
          </ChartCard>
        </div>
        <div className="col-12 col-lg-6">
          <ChartCard title="Umidade — últimas 2 horas" icon={<i className="fa-solid fa-droplet"></i>} badge="5 min">
            <HumidityChart deviceId="esp32-lab" intervalMs={15000} />
          </ChartCard>
        </div>

        <div className="col-12">
          <CompareControls />   {/* aqui vai o client component */}
        </div>
      </section>
    </div>
  );
}