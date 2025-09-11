// src/app/sobre/page.tsx
import ChartCard from "@/components/ChartCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SobrePage() {
  return (
    <div className="container py-4">
      <section className="chart-card mb-4">
        <h1 className="m-0">
          <i className="fa-solid fa-circle-info me-2"></i>Sobre o Projeto
        </h1>
      </section>

      <section className="row g-3">
        <div className="col-12">
          <ChartCard title="Visão Geral" icon={<i className="fa-solid fa-house-signal" />}>
            <p>
              Este projeto foi desenvolvido com o objetivo de criar um{" "}
              <strong>sistema de monitoramento climático doméstico</strong> em
              tempo real. Os dados são coletados a partir de um sensor{" "}
              <strong>DHT22</strong> conectado a um <strong>ESP32</strong>,
              enviados periodicamente para uma API e armazenados em{" "}
              <strong>MongoDB Atlas</strong>.
            </p>
            <p>
              Todo o frontend e backend foram construídos em{" "}
              <strong>Next.js 15</strong>, hospedados diretamente na{" "}
              <strong>Vercel</strong>, garantindo integração simples e rápida
              para o deploy.
            </p>
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard title="Coleta de Dados" icon={<i className="fa-solid fa-microchip" />}>
            <ul>
              <li>
                O <strong>ESP32</strong> lê temperatura e umidade do{" "}
                <strong>DHT22</strong>.
              </li>
              <li>
                Os dados são enviados via HTTP POST a cada{" "}
                <strong>5 minutos</strong>.
              </li>
              <li>
                Os pacotes possuem em média 120 bytes, otimizados para caber
                dentro dos limites gratuitos do MongoDB Atlas.
              </li>
            </ul>
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard title="Armazenamento" icon={<i className="fa-solid fa-database" />}>
            <ul>
              <li>
                Todos os registros são salvos em{" "}
                <strong>MongoDB Atlas</strong>.
              </li>
              <li>
                Cada documento possui:
                <ul>
                  <li>
                    <code>deviceId</code> — identificação do dispositivo
                  </li>
                  <li>
                    <code>temperature</code> — temperatura em °C
                  </li>
                  <li>
                    <code>humidity</code> — umidade em %
                  </li>
                  <li>
                    <code>ts</code> — timestamp (UTC)
                  </li>
                </ul>
              </li>
              <li>
                Queries com <code>$dateTrunc</code> são usadas para ajustar
                corretamente o fuso horário de São Paulo.
              </li>
            </ul>
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard title="Frontend" icon={<i className="fa-solid fa-display" />}>
            <p>
              O frontend foi desenhado com foco em{" "}
              <strong>responsividade e visual moderno</strong>, inspirado em
              aplicativos de previsão do tempo.
            </p>
            <ul>
              <li>Framework <strong>Bootstrap 5</strong></li>
              <li>Ícones <strong>FontAwesome</strong></li>
              <li>Gráficos interativos com <strong>Recharts</strong></li>
              <li>Atualização automática sem precisar recarregar a página</li>
            </ul>
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard title="Funcionalidades" icon={<i className="fa-solid fa-bolt" />}>
            <ul>
              <li>📊 Gráficos de temperatura e umidade (últimas 2h e 24h)</li>
              <li>
                🔄 Comparativo entre valores medidos e previsão meteorológica
                (via Open-Meteo)
              </li>
              <li>
                🌅 Cartões com informações de <strong>nascer e pôr do sol</strong>
              </li>
              <li>
                📅 Página de <strong>calendário</strong> para consultas passadas
              </li>
              <li>🌙 Identificação de dia/noite com ícones dinâmicos</li>
            </ul>
          </ChartCard>
        </div>

        <div className="col-12">
          <ChartCard title="Autor" icon={<i className="fa-solid fa-user" />}>
            <p>
              Projeto desenvolvido por <strong>Vítor Capelli</strong>, estudante
              de Engenharia de Controle e Automação, entusiasta de{" "}
              <strong>IoT</strong>, <strong>sistemas embarcados</strong> e{" "}
              <strong>desenvolvimento web</strong>.
            </p>
            <p>
              🔗 Confira mais projetos no GitHub:{" "}
              <a
                href="https://github.com/vitorcape"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/vitorcape
              </a>
            </p>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}