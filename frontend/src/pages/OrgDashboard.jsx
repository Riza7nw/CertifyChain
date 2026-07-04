import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, ExternalLink, ScrollText, ShieldCheck, Palette } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import CertStatus from "../components/CertStatus";
import FileCell from "../components/FileCell";
import MiniAreaChart from "../components/MiniAreaChart";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { fadeInUp, stagger } from "../lib/motion";

export default function OrgDashboard() {
  const { orgId } = useParams();
  const id = Number(orgId);
  const { apiFetch, isPlatformAdmin, memberships, setCurrentOrgId } = useAuth();
  const toast = useToast();

  const membership = memberships.find((m) => m.orgId === id);
  const role = isPlatformAdmin ? "PlatformAdmin" : membership?.role;
  const canIssue = isPlatformAdmin || ["OrgAdmin", "Issuer"].includes(membership?.role);
  const orgName = membership?.orgName || `Organisasi #${id}`;

  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, s] = await Promise.all([
        apiFetch(`/v1/orgs/${id}/certificates?page=1&limit=8`),
        apiFetch(`/v1/orgs/${id}/stats`),
      ]);
      setData(c);
      setStats(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, id]);

  useEffect(() => {
    setCurrentOrgId(id);
    load();
  }, [load, id, setCurrentOrgId]);

  async function provision() {
    setProvisioning(true);
    setError(null);
    try {
      await apiFetch(`/v1/orgs/${id}/provision`, { method: "POST", body: "{}" });
      toast.success("Organisasi terprovision", "Kini sertifikat bisa diterbitkan on-chain.");
      await load();
    } catch (e) {
      toast.error("Provisioning gagal", e.message);
    } finally {
      setProvisioning(false);
    }
  }

  const provisioned = data?.provisioned;
  const verifiedDaily = (stats?.verifiedDaily || []).map((d) => Number(d.count || 0));
  const verifiedTotal = verifiedDaily.reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Organisasi", to: "/orgs" }, { label: orgName }]}
        title={orgName}
        description={`Peran Anda: ${role || "—"}`}
        actions={
          <>
            {canIssue && (
              <Link to={`/orgs/${id}/templates`}><Button variant="secondary" icon={Palette}>Template</Button></Link>
            )}
            {canIssue && provisioned ? (
              <Link to={`/orgs/${id}/issue`}><Button icon={Plus}>Terbitkan</Button></Link>
            ) : isPlatformAdmin && data && !provisioned ? (
              <Button onClick={provision} loading={provisioning} icon={ShieldCheck}>Provision on-chain</Button>
            ) : null}
          </>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {data && !provisioned && (
        <Alert type="warning" title="Belum diprovision on-chain">
          Organisasi ini belum terdaftar di blockchain, jadi belum bisa menerbitkan sertifikat.
          {isPlatformAdmin ? " Klik “Provision on-chain”." : " Hubungi platform admin."}
        </Alert>
      )}

      <motion.div variants={stagger(0.07)} initial="hidden" animate="visible" className="grid gap-3 sm:grid-cols-3">
        <motion.div variants={fadeInUp}>
          <StatCard label="Total sertifikat" value={stats?.totals?.certificates ?? "—"} icon={ScrollText} />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard label="Verifikasi (30h)" value={verifiedTotal} icon={ShieldCheck} />
        </motion.div>
        <motion.div variants={fadeInUp} className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-xs">
          <span className="text-xs font-medium text-fg-muted">Status on-chain</span>
          <div className="mt-2">
            {provisioned ? <Badge tone="success" dot>Aktif</Badge> : <Badge tone="warning" dot>Belum</Badge>}
          </div>
        </motion.div>
      </motion.div>

      <Card title="Aktivitas verifikasi" description="30 hari terakhir">
        <MiniAreaChart data={verifiedDaily} height={80} className="text-brand" />
      </Card>

      <Card
        title="Sertifikat terbaru"
        action={provisioned && <Link to={`/orgs/${id}/issue`} className="text-sm text-brand hover:underline">Terbitkan</Link>}
      >
        {loading && !data ? (
          <SkeletonRows rows={4} />
        ) : (
          <DataTable
            rows={data?.items || []}
            rowKey={(r) => r.certificateId}
            empty={<EmptyState icon={ScrollText} title="Belum ada sertifikat" description="Sertifikat yang diterbitkan organisasi ini akan muncul di sini." />}
            columns={[
              { header: "Penerima", primary: true, cell: (r) => <span className="font-medium text-fg">{r.recipientName || "—"}</span> },
              { header: "Diterbitkan", cell: (r) => <span className="text-fg-muted">{r.issuedAt ? new Date(r.issuedAt).toLocaleDateString("id-ID") : "—"}</span> },
              { header: "Status", cell: (r) => <CertStatus status={r.status} /> },
              { header: "File", cell: (r) => <FileCell cert={r} /> },
              { header: "", align: "right", hideLabel: true, cell: (r) => <Link to={`/verify/${r.certificateId}`} className="inline-flex items-center gap-1 text-sm text-brand hover:underline">Verifikasi <ExternalLink className="h-3.5 w-3.5" /></Link> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
