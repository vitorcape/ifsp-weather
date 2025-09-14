/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

// RSS oficial INMET (avisos)
const INMET_RSS = "https://alerts.inmet.gov.br/cap_12/rss/alert-as.rss";

// Mapeamento severidade
const severityMap: Record<string, string> = {
  Extreme: "Extremo",
  Severe: "Grave",
  Moderate: "Moderado",
  Minor: "Leve",
};

// utils
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

const UF_BY_NAME: Record<string, string> = {
  "ACRE": "AC","ALAGOAS":"AL","AMAPA":"AP","AMAZONAS":"AM","BAHIA":"BA","CEARA":"CE",
  "DISTRITO FEDERAL":"DF","ESPIRITO SANTO":"ES","GOIAS":"GO","MARANHAO":"MA","MATO GROSSO":"MT",
  "MATO GROSSO DO SUL":"MS","MINAS GERAIS":"MG","PARA":"PA","PARAIBA":"PB","PARANA":"PR",
  "PERNAMBUCO":"PE","PIAUI":"PI","RIO DE JANEIRO":"RJ","RIO GRANDE DO NORTE":"RN","RIO GRANDE DO SUL":"RS",
  "RONDONIA":"RO","RORAIMA":"RR","SANTA CATARINA":"SC","SAO PAULO":"SP","SERGIPE":"SE","TOCANTINS":"TO",
};

const REGION_TO_UFS: Record<string, string[]> = {
  "NORTE": ["AC","AM","AP","PA","RO","RR","TO"],
  "NORDESTE": ["AL","BA","CE","MA","PB","PE","PI","RN","SE"],
  "CENTRO OESTE": ["DF","GO","MT","MS"],
  "CENTRO-OESTE": ["DF","GO","MT","MS"],
  "SUDESTE": ["ES","MG","RJ","SP"],
  "SUL": ["PR","RS","SC"],
};

function extractUFs(text: string): string[] {
  const n = norm(text);
  const ufs = new Set<string>();
  Object.keys(UF_BY_NAME).forEach((k) => { if (n.includes(k)) ufs.add(UF_BY_NAME[k]); });
  Object.keys(REGION_TO_UFS).forEach((reg) => { if (n.includes(reg)) REGION_TO_UFS[reg].forEach(u=>ufs.add(u)); });
  const ufTokens = n.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/g);
  if (ufTokens) ufTokens.forEach((u) => ufs.add(u));
  return Array.from(ufs);
}

async function fetchText(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { next: { revalidate: 300 }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

// Verifica se um CAP (XML detalhado) lista o município desejado em <parameter><valueName>Municipios</valueName><value>...</value>
function capContainsCity(xml: string, city: string, uf: string): boolean {
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, attributeNamePrefix: "@_" });
  const data = parser.parse(xml);
  const info = data?.alert?.info;
  if (!info) return false;

  const params = Array.isArray(info?.parameter) ? info.parameter : (info?.parameter ? [info.parameter] : []);
  const muniParam = params.find((p: any) => (p?.valueName ?? p?.valuename) === "Municipios");
  const value: string = muniParam?.value || "";
  if (!value) return false;

  const n = norm(value);
  const needle1 = norm(`${city} - ${uf}`);
  // também aceita apenas o nome da cidade (para casos raros)
  const needle2 = norm(city);
  return n.includes(needle1) || n.includes(needle2);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ufParam = (searchParams.get("uf") || "").toUpperCase();   // ex.: SP
  const cityParam = (searchParams.get("city") || "").trim();      // ex.: Catanduva

  try {
    // 1) Busca RSS
    const xmlRss = await fetchText(INMET_RSS);
    const parser = new XMLParser({
      ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: true,
    });
    const rss = parser.parse(xmlRss);
    let items: any[] = rss?.rss?.channel?.item || [];
    if (!Array.isArray(items)) items = items ? [items] : [];

    // 2) Mapeia itens básicos
    const basic = items.map((it: any) => {
      const cap = {
        event: it?.cap_event ?? it?.event ?? it?.title ?? "",
        severity: it?.cap_severity ?? it?.severity ?? "",
        areaDesc: it?.cap_areaDesc ?? it?.areaDesc ?? it?.cap_area ?? "",
        effective: it?.cap_effective ?? it?.pubDate ?? it?.date ?? "",
        onset: it?.cap_onset ?? it?.cap_effective ?? "",
        expires: it?.cap_expires ?? it?.cap_ends ?? "",
        headline: it?.cap_headline ?? it?.title ?? "",
        description: it?.description ?? "",
        link: it?.link ?? "",
        title: it?.title ?? "",
      };

      const sevPt = severityMap[cap.severity] ?? (cap.severity || "—");
      const blob = [cap.areaDesc, cap.title, cap.description].filter(Boolean).join(" ; ");
      const ufs = extractUFs(blob);

      return {
        title: (cap.headline || cap.event || "").toString(),
        severity: sevPt,
        area: cap.areaDesc,
        effective: cap.effective || cap.onset || "",
        expires: cap.expires || "",
        link: cap.link,
        ufs,
      };
    });

    // 3) Filtro por UF (quando informado)
    let filtered = ufParam ? basic.filter((m) => m.ufs.includes(ufParam)) : basic;

    // 4) Filtro por MUNICÍPIO (quando informado)
    if (cityParam) {
      // Para cada alerta restante, baixa o CAP detalhado (URL em link) e verifica Municipios
      const checks = await Promise.all(
        filtered.map(async (it) => {
          try {
            if (!it.link) return false;
            const capXml = await fetchText(it.link);
            return capContainsCity(capXml, cityParam, ufParam || "SP"); // se UF não veio, assume SP como default comum
          } catch {
            return false;
          }
        })
      );

      filtered = filtered.filter((_, i) => checks[i]);
    }

    // 4b) Filtro por data (somente hoje e ontem)
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    filtered = filtered.filter((it) => {
      if (!it.effective) return false;
      const d = new Date(it.effective);
      return d >= start && d <= end;
    });

    // 5) Ordena por severidade e data
    const order = { Extremo: 4, Grave: 3, Moderado: 2, Leve: 1, "—": 0 } as Record<string, number>;
    filtered.sort((a, b) => {
      const s = order[b.severity] - order[a.severity];
      if (s !== 0) return s;
      return String(b.effective).localeCompare(String(a.effective));
    });

    return NextResponse.json({ ok: true, count: filtered.length, alerts: filtered });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro inesperado" }, { status: 500 });
  }
}