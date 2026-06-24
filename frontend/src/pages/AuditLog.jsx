import { useEffect, useState } from "react";
import Card from "../components/Card";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { getAuditLog } from "../api/certificateApi";

// Warna badge per jenis event audit.
const TYPE_STYLES = {
  LOGIN_SUCCESS: "bg-emerald-50 text-emerald-700",
  LOGIN_FAILED: "bg-red-50 text-red-700",
  CERTIFICATE_ISSUED: "bg-brand-50 text-brand-700",
};

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString("id-ID");
}

// Halaman admin: menampilkan audit log backend (GET /api/audit dengan token).
export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getAuditLog(100)
      .then((data) => {
        if (active) setEntries(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        // 401 sudah ditangani api (redirect ke /login). Sisanya tampilkan pesan.
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Catatan aktivitas keamanan & penerbitan sertifikat (sisi backend).
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Card title="Aktivitas Terbaru" description="100 entri terakhir, terbaru di atas.">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <Spinner className="h-4 w-4" /> Memuat audit log…
          </div>
        ) : entries.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">Belum ada entri audit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4 font-medium">Waktu</th>
                  <th className="py-2 pr-4 font-medium">Event</th>
                  <th className="py-2 pr-4 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const { timestamp, type, ...rest } = e;
                  const detail = Object.entries(rest)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" • ");
                  return (
                    <tr key={i} className="border-b border-slate-50 align-top">
                      <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">
                        {fmtTime(timestamp)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                            TYPE_STYLES[type] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {type || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 break-all text-slate-600">{detail || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
