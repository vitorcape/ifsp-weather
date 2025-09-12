// src/app/layout.tsx
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import NowBadgeClient from "@/components/NowBadgeClient";

export const metadata: Metadata = {
  title: "Estação Meteorológica",
  description: "Projeto IFSP Catanduva",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-sky text-white d-flex flex-column min-vh-100">
        {/* NAV */}
        <nav className="navbar navbar-expand-lg navbar-translucent border-0">
          <div className="container d-flex align-items-center">
            <div className="d-flex align-items-center gap-3">
              <Link className="navbar-brand text-white fw-semibold d-flex align-items-center gap-2 m-0" href="/">
                <i className="fa-solid fa-satellite"></i>
                <span>Estação Metereológica</span>
              </Link>
              <NowBadgeClient refreshMs={30000} />
            </div>
            <div className="ms-auto d-flex align-items-center gap-3">
              <Link className="btn btn-sm btn-outline-light rounded-pill px-3" href="/graficos">
                <i className="fa-solid fa-chart-line me-2"></i>Gráficos
              </Link>
              <Link className="btn btn-sm btn-outline-light rounded-pill px-3" href="/calendario">
                <i className="fa-solid fa-calendar-days me-2"></i>Calendário
              </Link><Link className="btn btn-sm btn-outline-light rounded-pill px-3" href="/log">
                <i className="fa-solid fa-database me-2"></i>Logs
              </Link>
            </div>
          </div>
        </nav>

        {/* CONTEÚDO */}
        <main className="content-wrapper flex-grow-1">{children}</main>

        {/* FOOTER */}
        <footer className="footer-glass mt-auto py-3">
          <div className="container text-center small">
            <div className="mb-1">
              <i className="fa-solid fa-satellite me-2"></i>
              Projeto IoT com ESP32 • Dados em tempo real
            </div>
            <div className="text-white-50">
              © {new Date().getFullYear()} Estação Metereológica • Desenvolvido com{" "}
              <i className="fa-solid fa-heart text-danger"></i>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}