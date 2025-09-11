// src/app/calendario/page.tsx
import CalendarView from "@/components/CalendarView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function CalendarioPage() {
  return (
    <div className="container py-4">
      <section className="chart-card mb-3">
        <h2 className="m-0"><i className="fa-solid fa-calendar"></i> Calendário</h2>
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <span className="chart-legend fw-normal mt-2">Selecione uma data para exibir informações</span>
        </div>
      </section>
      <CalendarView />
    </div>
  );
}