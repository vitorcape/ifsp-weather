// src/app/dados/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import Swal from "sweetalert2";

type Reading = {
  _id: string;
  deviceId: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  rain_mm2: number | null;
  wind_ms: number | null;
  ts: string; // ISO
};

const TZ = "America/Sao_Paulo";

// ======= Utils de data =======
function todaySP() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}
function startOfDaySP(d: Date) {
  const x = new Date(new Date(d).toLocaleString("en-US", { timeZone: TZ }));
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDaySP(d: Date) {
  const x = new Date(new Date(d).toLocaleString("en-US", { timeZone: TZ }));
  x.setHours(23, 59, 59, 999);
  return x;
}
function fmtLocal(dtISO: string) {
  const d = new Date(dtISO);
  return d.toLocaleString("pt-BR", { timeZone: TZ });
}

// ======= Sessão (token) =======
const AUTH_LS_KEY = "dadosAuth";           // onde guardo a sessão
const SESSION_MINUTES = 120;               // validade da sessão (ex.: 120min)

type AuthSession = {
  token: string;
  expiresAt: number; // epoch ms
};

function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as AuthSession;
    if (!obj?.token || !obj?.expiresAt) return null;
    if (Date.now() >= obj.expiresAt) return null;
    return obj;
  } catch {
    return null;
  }
}
function setSession(token: string, minutes = SESSION_MINUTES) {
  const expiresAt = Date.now() + minutes * 60 * 1000;
  const sess: AuthSession = { token, expiresAt };
  localStorage.setItem(AUTH_LS_KEY, JSON.stringify(sess));
}
function clearSession() {
  localStorage.removeItem(AUTH_LS_KEY);
}

// =====================================================

export default function DadosPage() {
  // Gate de autenticação
  const [authed, setAuthed] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  // Filtros
  const [range, setRange] = useState<DateRange | undefined>({
    from: startOfDaySP(todaySP()),
    to: endOfDaySP(todaySP()),
  });
  const [deviceId, setDeviceId] = useState("");

  // Dados
  const [rows, setRows] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Seleção e criação
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState<Partial<Reading>>({
    deviceId: "",
    temperature: null,
    humidity: null,
    pressure: null,
    rain_mm2: null,
    wind_ms: null,
    ts: new Date().toISOString(),
  });

  // Checa sessão ao montar
  useEffect(() => {
    const sess = getSession();
    setAuthed(!!sess);
  }, []);

  // Monta query para a API
  const params = useMemo(() => {
    if (!range?.from || !range?.to) return "";
    const from = startOfDaySP(range.from).toISOString();
    const to = endOfDaySP(range.to).toISOString();
    const qs = new URLSearchParams({ from, to });
    if (deviceId.trim()) qs.set("deviceId", deviceId.trim());
    return qs.toString();
  }, [range?.from, range?.to, deviceId]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/readings?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr: unknown =
        Array.isArray(json) ? json :
        (json && Array.isArray((json as any).items) ? (json as any).items : []);
      setRows((arr ?? []) as Reading[]);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authed) {
      // só carrega se autenticado
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, authed]);

  function requireValidSession(): string | null {
    const sess = getSession();
    if (!sess) {
      setAuthed(false);
      Swal.fire({
        icon: "warning",
        title: "Sessão expirada",
        text: "Faça login novamente para continuar.",
      });
      return null;
    }
    return sess.token;
  }

  function updateCell(id: string, key: keyof Reading, value: string) {
    setRows(prev =>
      prev.map(r => (r._id === id ? { ...r, [key]: key === "ts" ? value : value === "" ? null : Number(value) } : r))
    );
  }

  async function saveRow(r: Reading) {
    const token = requireValidSession();
    if (!token) return;
    try {
      const res = await fetch(`/api/readings/${r._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token, // usa token da sessão
        },
        body: JSON.stringify({
          deviceId: r.deviceId ?? null,
          temperature: r.temperature,
          humidity: r.humidity,
          pressure: r.pressure,
          rain_mm2: r.rain_mm2,
          wind_ms: r.wind_ms,
          ts: r.ts,
        }),
      });

      if (!res.ok) throw new Error(`Falha ao salvar (HTTP ${res.status})`);

      Swal.fire({ icon: "success", title: "Alteração salva!", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Erro ao salvar", text: String(err) });
    }
  }

  async function deleteSelected() {
    const token = requireValidSession();
    if (!token) return;

    const ids = Object.keys(selection).filter(id => selection[id]);
    if (!ids.length) return;

    const confirm = await Swal.fire({
      title: `Excluir ${ids.length} registro(s)?`,
      text: "Essa ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    try {
      for (const id of ids) {
        await fetch(`/api/readings/${id}`, {
          method: "DELETE",
          headers: { "x-admin-token": token },
        });
      }
      setSelection({});
      await load();

      Swal.fire({ icon: "success", title: "Registros excluídos!", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Erro ao excluir", text: String(err) });
    }
  }

  async function createOne() {
    const token = requireValidSession();
    if (!token) return;
    try {
      const res = await fetch(`/api/readings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify(creating),
      });

      if (!res.ok) throw new Error(`Falha ao criar (HTTP ${res.status})`);

      setCreating({
        deviceId: "",
        temperature: null,
        humidity: null,
        pressure: null,
        rain_mm2: null,
        wind_ms: null,
        ts: new Date().toISOString(),
      });
      await load();

      Swal.fire({ icon: "success", title: "Registro criado!", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Erro ao criar", text: String(err) });
    }
  }

  function doLogin(e: React.FormEvent) {
    e.preventDefault();
    const tok = tokenInput.trim();
    if (!tok) {
      Swal.fire({ icon: "warning", title: "Informe o token" });
      return;
    }
    setSession(tok);        // salva no localStorage com expiração
    setAuthed(true);
    setTokenInput("");
    Swal.fire({ icon: "success", title: "Acesso liberado!", timer: 1200, showConfirmButton: false });
  }

  function doLogout() {
    clearSession();
    setAuthed(false);
    setRows([]);
    setSelection({});
  }

  const isDay = true;
  const cardBg = isDay ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)";
  const cardBor = isDay ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)";

  // ========= Tela de Login =========
  if (!authed) {
    return (
      <div className="container py-5 d-flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
        <div className="chart-card p-4" style={{ maxWidth: 440, width: "100%", background: cardBg, border: `1px solid ${cardBor}`, borderRadius: 16 }}>
          <h2 className="h4 text-white mb-3">
            <i className="fa-solid fa-lock me-2"></i> Acesso restrito
          </h2>
          <p className="text-white-50 mb-3">Informe o token para gerenciar os dados. A sessão expira em {SESSION_MINUTES} min.</p>
          <form onSubmit={doLogin}>
            <label className="form-label text-white-50">Token</label>
            <input
              type="password"
              className="form-control mb-3"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Cole o token aqui"
              autoFocus
            />
            <button className="btn btn-primary w-100" type="submit">
              <i className="fa-solid fa-right-to-bracket me-2"></i> Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ========= Página principal =========
  return (
    <div className="container py-4">
      <section className="chart-card mb-3 p-3" style={{ background: cardBg, border: `1px solid ${cardBor}`, borderRadius: 16 }}>
        <div className="d-flex align-items-center justify-content-between gap-2">
          <h2 className="m-0 text-white"><i className="fa-solid fa-database me-2"></i> Gestão de Dados</h2>
          <button className="btn btn-outline-light btn-sm" onClick={doLogout}>
            <i className="fa-solid fa-right-from-bracket me-2"></i> Sair
          </button>
        </div>

        <div className="row mt-3 g-3">
          <div className="col-12 col-lg-4">
            <div className="p-2" style={{ background: cardBg, border: `1px solid ${cardBor}`, borderRadius: 12 }}>
              <div className="fw-semibold mb-2"><i className="fa-regular fa-calendar-range me-2"></i>Período</div>
              <DayPicker
                mode="range"
                selected={range}
                onSelect={(r) => setRange(r ?? undefined)}
                locale={ptBR}
                weekStartsOn={1}
                showOutsideDays
                fromYear={2023}
                toYear={2030}
                captionLayout="dropdown"
              />
            </div>
          </div>
          <div className="col-12 col-lg-8">
            <div className="p-2" style={{ background: cardBg, border: `1px solid ${cardBor}`, borderRadius: 12 }}>
              <div className="d-flex flex-wrap gap-2 align-items-end">
                <div>
                  <label className="form-label mb-1">Device ID</label>
                  <input className="form-control" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="Opcional" />
                </div>
                <button className="btn btn-primary ms-auto" onClick={load}>
                  <i className="fa-solid fa-magnifying-glass me-2"></i> Buscar
                </button>
                <button className="btn btn-outline-danger" onClick={deleteSelected}>
                  <i className="fa-solid fa-trash me-2"></i> Excluir selecionados
                </button>
              </div>

              <div className="mt-3 table-responsive" style={{ maxHeight: 520, overflow: "auto" }}>
                {loading && <div className="text-muted">Carregando…</div>}
                {err && <div className="text-warning">Erro: {err}</div>}
                {!loading && !err && (
                  <table className="table table-sm align-middle">
                    <thead className="table-light" style={{ position: "sticky", top: 0 }}>
                      <tr>
                        <th style={{ width: 36 }}></th>
                        <th>Device</th>
                        <th>Temp (°C)</th>
                        <th>Umid (%)</th>
                        <th>Press (Pa)</th>
                        <th>Chuva (mm)</th>
                        <th>Vento (km/h)</th>
                        <th>Timestamp (ISO)</th>
                        <th style={{ width: 90 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rows ?? []).map((r) => (
                        <tr key={r._id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!selection[r._id]}
                              onChange={(e) => setSelection(s => ({ ...s, [r._id]: e.target.checked }))}
                            />
                          </td>
                          <td>
                            <input className="form-control form-control-sm"
                                   value={r.deviceId}
                                   onChange={(e) => updateCell(r._id, "deviceId", e.target.value)} />
                          </td>
                          <td>
                            <input type="number" step="0.1" className="form-control form-control-sm"
                                   value={r.temperature ?? ""}
                                   onChange={(e) => updateCell(r._id, "temperature", e.target.value)} />
                          </td>
                          <td>
                            <input type="number" step="1" className="form-control form-control-sm"
                                   value={r.humidity ?? ""}
                                   onChange={(e) => updateCell(r._id, "humidity", e.target.value)} />
                          </td>
                          <td>
                            <input type="number" step="1" className="form-control form-control-sm"
                                   value={r.pressure ?? ""}
                                   onChange={(e) => updateCell(r._id, "pressure", e.target.value)} />
                          </td>
                          <td>
                            <input type="number" step="0.1" className="form-control form-control-sm"
                                   value={r.rain_mm2 ?? ""}
                                   onChange={(e) => updateCell(r._id, "rain_mm2", e.target.value)} />
                          </td>
                          <td>
                            <input type="number" step="0.1" className="form-control form-control-sm"
                                   value={r.wind_ms ?? ""}
                                   onChange={(e) => updateCell(r._id, "wind_ms", e.target.value)} />
                          </td>
                          <td>
                            <input className="form-control form-control-sm"
                                   value={r.ts}
                                   onChange={(e) => updateCell(r._id, "ts", e.target.value)} />
                            <div className="small text-muted">{fmtLocal(r.ts)}</div>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <button className="btn btn-sm btn-success" onClick={() => saveRow(r)}>
                                <i className="fa-solid fa-save"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={async () => {
                                  const tok = requireValidSession();
                                  if (!tok) return;
                                  const confirm = await Swal.fire({
                                    title: "Excluir este registro?",
                                    icon: "warning",
                                    showCancelButton: true,
                                    confirmButtonText: "Excluir",
                                    cancelButtonText: "Cancelar",
                                  });
                                  if (!confirm.isConfirmed) return;
                                  await fetch(`/api/readings/${r._id}`, {
                                    method: "DELETE",
                                    headers: { "x-admin-token": tok },
                                  });
                                  await load();
                                }}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(rows ?? []).length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center text-muted py-4">
                            Sem registros no período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* criar novo */}
              <div className="mt-3 p-2 border rounded">
                <div className="fw-semibold mb-2"><i className="fa-solid fa-plus me-2"></i> Inserir leitura</div>
                <div className="row g-2">
                  {([
                    ["deviceId", "Device ID", "text"],
                    ["temperature", "Temp (°C)", "number"],
                    ["humidity", "Umid (%)", "number"],
                    ["pressure", "Press (Pa)", "number"],
                    ["rain_mm2", "Chuva (mm)", "number"],
                    ["wind_ms", "Vento (km/h)", "number"],
                    ["ts", "Timestamp ISO", "text"],
                  ] as const).map(([key, label, type]) => (
                    <div key={key} className="col-12 col-md-6 col-xl-3">
                      <label className="form-label mb-1">{label}</label>
                      <input
                        type={type}
                        className="form-control form-control-sm"
                        value={String((creating as any)[key] ?? "")}
                        onChange={(e) =>
                          setCreating(c => ({
                            ...c,
                            [key]: type === "number"
                              ? (e.target.value === "" ? null : Number(e.target.value))
                              : e.target.value
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <button className="btn btn-primary" onClick={createOne}>
                    <i className="fa-solid fa-check me-2"></i> Criar
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}