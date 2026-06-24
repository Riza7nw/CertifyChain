import { useState, useEffect, useCallback } from "react";
import Card from "../components/Card";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { getStats } from "../api/certificateApi";

const DAYS = 30;

function StatCard({ label, value, color }) {
  return (
    <Card className="text-center">
      <p className={`text-3xl font-bold ${color}`}>{Number(value || 0).toLocaleString("id-ID")}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Card>
  );
}

function formatDay(day) {
  // day diharapkan "YYYY-MM-DD"; tampilkan ringkas "DD/MM".
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" });
}

// Bar chart vertikal sederhana berbasis CSS, tanpa dependency.
function BarChart({ data, valueKey, barClass }) {
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Belum ada data pada periode ini.</p>;
  }
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ height: 160 }}>
      {data.map((d) => {
        const value = Number(d[valueKey]) || 0;
        const pct = Math.round((value / max) * 100);
        return (
          <div key={d.day} className="flex min-w-[14px] flex-1 flex-col items-center gap-1" title={`${d.day}: ${value}`}>
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t ${barClass}`}
                style={{ height: `${value === 0 ? 2 : Math.max(pct, 4)}%` }}
              />
            </div>
            <span className="hidden text-[9px] leading-none text-slate-400 sm:block">
              {formatDay(d.day)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStats(DAYS);
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Statistik</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ringkasan global dari read-model (DB) — aktivitas {DAYS} hari terakhir.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Memuat statistik…</span>
        </div>
      ) : (
        stats && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Total Sertifikat" value={stats.totals?.certificates} color="text-brand-600" />
              <StatCard label="Total Institusi" value={stats.totals?.institutions} color="text-emerald-600" />
              <StatCard label="Total Verifikasi" value={stats.totals?.verifications} color="text-amber-600" />
            </div>

            <Card title="Sertifikat Diterbitkan / Hari" description={`${DAYS} hari terakhir`}>
              <BarChart data={stats.issuedDaily} valueKey="count" barClass="bg-brand-500" />
            </Card>

            <Card title="Verifikasi / Hari" description={`${DAYS} hari terakhir`}>
              <BarChart data={stats.verifiedDaily} valueKey="count" barClass="bg-emerald-500" />
              <p className="mt-2 text-xs text-slate-400">
                Batang menunjukkan total verifikasi (valid &amp; tidak valid) per hari.
              </p>
            </Card>
          </>
        )
      )}
    </div>
  );
}
