import { getDb } from "@/lib/mongodb";
import { getSunInfo } from "@/lib/sun";

const TZ = "America/Sao_Paulo";

function parseHM(isoLocal: string) {
  const [h, m] = isoLocal.slice(11, 16).split(":").map(Number);
  return { h, m };
}
function toMinutes(h: number, m: number) {
  return h * 60 + m;
}

export default async function NowBadge() {
  const db = await getDb();
  const [last] = await db.collection<{ temperature: number; ts: Date }>("readings")
    .find({}).sort({ ts: -1 }).limit(1).toArray();

  const sun = await getSunInfo();
  const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const nowMin = toMinutes(nowSP.getHours(), nowSP.getMinutes());
  const { h: sh, m: sm } = parseHM(sun.sunrise);
  const { h: eh, m: em } = parseHM(sun.sunset);
  const isDay = nowMin >= toMinutes(sh, sm) && nowMin < toMinutes(eh, em);

  const icon = isDay ? "fa-sun" : "fa-moon";
  const temp = last ? `${last.temperature.toFixed(1)}°C` : "--°C";

  return (
    <span className="badge bg-light text-dark rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2">
      <i className={`fa-solid ${icon}`}></i>
      <span className="fw-semibold">{temp}</span>
    </span>
  );
}