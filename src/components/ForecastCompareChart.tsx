"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from "recharts";

type Reading = { deviceId: string; temperature: number; ts: string };
type Row = { label: string; forecast: number | null; measured: number | null };

const TZ = "America/Sao_Paulo";
const LAT = -21.1383, LON = -48.9738;

function isTodaySP(ymd: string) {
  const now = new Date(new Date().toLocaleString("en-US",{timeZone:TZ}));
  const y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,"0"),
        d=String(now.getDate()).padStart(2,"0");
  return ymd===`${y}-${m}-${d}`;
}
function spMidnightISO(ymd: string) {
  const start=new Date(`${ymd}T00:00:00-03:00`);
  const end=new Date(start.getTime()+86400000);
  return { sinceISO:start.toISOString(), untilISO:end.toISOString() };
}

export default function ForecastCompareChart({
  deviceId="esp32-001", refreshMs=60000, dateYMD
}: { deviceId?:string; refreshMs?:number; dateYMD:string }) {
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(false), [err,setErr]=useState<string|null>(null);

  const fetchAll=useCallback(async ()=>{
    try {
      setLoading(true); setErr(null);
      // forecast
      const fRes=await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`+
        `&hourly=temperature_2m&timezone=${encodeURIComponent(TZ)}`+
        `&start_date=${dateYMD}&end_date=${dateYMD}`,{cache:"no-store"}
      );
      if(!fRes.ok) throw new Error("forecast falhou");
      const fJ=await fRes.json() as any;
      const fMap=new Map<number,number>();
      fJ.hourly.time.forEach((t:string,i:number)=>{
        fMap.set(Number(t.slice(11,13)), fJ.hourly.temperature_2m[i]);
      });
      // measured
      const {sinceISO,untilISO}=spMidnightISO(dateYMD);
      const rRes=await fetch(
        `/api/readings?deviceId=${encodeURIComponent(deviceId!)}`+
        `&since=${sinceISO}&until=${untilISO}&limit=2000`,{cache:"no-store"}
      );
      if(!rRes.ok) throw new Error("leituras falharam");
      const rJ=await rRes.json() as Reading[];
      const buckets:Array<{sum:number; n:number}|null>=Array(24).fill(null);
      rJ.forEach(r=>{
        const h=new Date(new Date(r.ts).toLocaleString("en-US",{timeZone:TZ})).getHours();
        if(!buckets[h]) buckets[h]={sum:0,n:0};
        buckets[h]!.sum+=r.temperature; buckets[h]!.n++;
      });
      const measured=buckets.map(b=>b?b.sum/b.n:null);

      const newRows:Array<Row>=Array.from({length:24},(_,h)=>({
        label:`${String(h).padStart(2,"0")}:00`,
        forecast:fMap.get(h)||null,
        measured:measured[h]
      }));
      setRows(newRows);
    } catch(e:any){
      setErr(e.message); setRows([]);
    } finally { setLoading(false); }
  },[deviceId,dateYMD]);

  useEffect(()=>{
    fetchAll();
    const iv=isTodaySP(dateYMD)?setInterval(fetchAll,refreshMs):undefined;
    return()=>iv&&clearInterval(iv);
  },[fetchAll,refreshMs,dateYMD]);

  const data=useMemo(()=>rows,[rows]);
  const hasAny=data.some(r=>r.forecast!=null)||data.some(r=>r.measured!=null);

  return (
    <div className="chart-card p-4">
      <div className="d-flex justify-content-between mb-2">
        {err
          ?<div className="text-warning">Erro: {err}</div>
          :loading&&!hasAny
            ?<div className="text-muted">Carregando…</div>
            :!loading&&!hasAny
              ?<div className="text-muted">Sem dados</div>
              :<></>}
        <div className="small text-muted">Data: {dateYMD.split("-").reverse().join("/")}</div>
      </div>
      {hasAny&&(
        <div style={{height:300}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{top:10,right:10,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
              <XAxis dataKey="label" tick={{fontSize:12}} interval={1}/>
              <YAxis unit="°C" tick={{fontSize:12}} width={50} domain={["auto","auto"]}/>
              <Tooltip formatter={(v,name)=>[typeof v==="number"?v.toFixed(1):v,name]}/>
              <Legend verticalAlign="top" height={36}/>
              <Line type="monotone" dataKey="forecast" name="Previsão (°C)" stroke="#0d6efd" dot={{r:2}}/>
              <Line type="monotone" dataKey="measured" name="Medido (°C)" stroke="#dc3545" dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}