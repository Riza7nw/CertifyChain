import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ChevronRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import Avatar from "../components/Avatar";
import Alert from "../components/Alert";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import { EASE, fadeInUp, stagger } from "../lib/motion";

function RoleBadge({ role }) {
  const tone = role === "PlatformAdmin" ? "brand" : role === "OrgAdmin" ? "info" : role === "Issuer" ? "success" : "neutral";
  return <Badge tone={tone}>{role || "—"}</Badge>;
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
    <div className="space-y-5">
      <PageHeader
        title="Organisasi"
        description={isPlatformAdmin ? "Semua organisasi (platform admin)." : "Organisasi tempat Anda menjadi anggota."}
      />

      {error && <Alert type="error">{error}</Alert>}

      {!orgs && !error && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      )}

      {orgs && orgs.length === 0 && (
        <EmptyState icon={Building2} title="Belum ada organisasi" description="Anda belum menjadi anggota organisasi mana pun." />
      )}

      {orgs && orgs.length > 0 && (
      <motion.div variants={stagger(0.06)} initial="hidden" animate="visible" className="grid gap-3 sm:grid-cols-2">
        {orgs.map((o) => (
          <motion.button
            key={o.id}
            variants={fadeInUp}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2, ease: EASE }}
            onClick={() => open(o)}
            className="group flex flex-col rounded-xl border border-line bg-surface p-4 text-left shadow-xs transition-colors hover:border-line-strong hover:bg-surface-hover"
          >
            <div className="flex items-center gap-3">
              <Avatar name={o.name} square brand />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg">{o.name}</p>
                <p className="truncate text-xs text-fg-faint">/{o.slug}</p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-fg-faint transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-fg-muted">{o.certificateCount} sertifikat</span>
              <div className="flex items-center gap-2">
                {o.provisioned ? <Badge tone="success" dot>on-chain</Badge> : <Badge tone="warning" dot>belum</Badge>}
                <RoleBadge role={o.role} />
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
      )}
    </div>
  );
}
