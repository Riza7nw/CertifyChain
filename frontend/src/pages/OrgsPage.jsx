import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Card from "../components/Card";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";

function RoleBadge({ role }) {
  const color =
    role === "PlatformAdmin" ? "bg-purple-50 text-purple-700"
      : role === "OrgAdmin" ? "bg-brand-50 text-brand-700"
      : role === "Issuer" ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-100 text-slate-600";
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}>{role || "—"}</span>;
}

export default function OrgsPage() {
  const { apiFetch, setCurrentOrgId, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setOrgs(await apiFetch("/v1/orgs"));
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [apiFetch]);

  function open(o) {
    setCurrentOrgId(o.id);
    navigate(`/orgs/${o.id}`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organisasi</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isPlatformAdmin ? "Semua organisasi (platform admin)." : "Organisasi tempat Anda menjadi anggota."}
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {!orgs && !error && (
        <div className="flex items-center gap-3 py-10 text-slate-500">
          <Spinner className="h-5 w-5" /> <span className="text-sm">Memuat organisasi…</span>
        </div>
      )}

      {orgs && orgs.length === 0 && (
        <Card><p className="text-sm text-slate-500">Belum ada organisasi.</p></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {orgs?.map((o) => (
          <button key={o.id} onClick={() => open(o)} className="text-left">
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">{o.name}</h2>
                <RoleBadge role={o.role} />
              </div>
              <p className="mt-1 text-xs text-slate-400">/{o.slug}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-600">{o.certificateCount} sertifikat</span>
                {o.provisioned ? (
                  <span className="text-emerald-600">● on-chain</span>
                ) : (
                  <span className="text-amber-600">● belum diprovision</span>
                )}
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
