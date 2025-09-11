// src/app/page.tsx
import HomeCards from "@/components/HomeCards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="container py-4">
      <HomeCards refreshMs={15000} />
      <footer className="mt-5 small text-white-50 text-center">
        Dados tirado do cu via ESP32 • Fuso: America/São Paulo
      </footer>
    </div>
  );
}
