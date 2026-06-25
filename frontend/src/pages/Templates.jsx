import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, Palette } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/Confirm";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { TextField, SelectField } from "../components/Field";

export default function Templates() {
  const { orgId } = useParams();
  const id = Number(orgId);
  const { apiFetch, memberships } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const orgName = memberships.find((m) => m.orgId === id)?.orgName || `Organisasi #${id}`;

  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", key: "classic", accent: "#5E4FDB" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await apiFetch(`/v1/orgs/${id}/templates`));
    } catch (e) {
      setError(e.message);
    }
  }, [apiFetch, id]);

  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Nama template wajib diisi.");
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/orgs/${id}/templates`, { method: "POST", body: JSON.stringify({ name: form.name.trim(), key: form.key, accent: form.accent }) });
      toast.success("Template dibuat");
      setForm({ name: "", key: "classic", accent: "#5E4FDB" });
      await load();
    } catch (e) {
      toast.error("Gagal membuat template", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(t) {
    if (!(await confirm({ title: "Hapus template?", description: `Template "${t.name}" akan dihapus.`, confirmText: "Hapus" }))) return;
    try {
      await apiFetch(`/v1/orgs/${id}/templates/${t.id}`, { method: "DELETE" });
      toast.success("Template dihapus");
      await load();
    } catch (e) {
      toast.error("Gagal menghapus", e.message);
    }
  }

  const scopeTone = { base: "neutral", global: "info", org: "brand" };

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: orgName, to: `/orgs/${id}` }, { label: "Template" }]}
        title="Kelola template"
        description="Desain & warna aksen PDF sertifikat untuk institusi Anda."
      />

      {error && <Alert type="error">{error}</Alert>}

      <Card title="Buat template baru">
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <TextField id="tname" label="Nama" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="mis. Wisuda 2026" disabled={busy} />
          <SelectField id="tkey" label="Desain dasar" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} disabled={busy}>
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
          </SelectField>
          <div>
            <label htmlFor="taccent" className="mb-1.5 block text-sm font-medium text-fg">Aksen</label>
            <input id="taccent" type="color" value={form.accent} onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))} disabled={busy} className="h-10 w-16 cursor-pointer rounded-lg border border-line-strong bg-surface p-1" />
          </div>
          <Button type="submit" icon={Plus} loading={busy}>Buat</Button>
        </form>
      </Card>

      <Card title="Template tersedia">
        {!items ? (
          <SkeletonRows rows={3} />
        ) : items.length === 0 ? (
          <EmptyState icon={Palette} title="Belum ada template" />
        ) : (
          <div className="space-y-2.5">
            {items.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-line p-3.5">
                <span className="h-9 w-9 flex-shrink-0 rounded-lg border border-line" style={{ backgroundColor: t.accent || "#5E4FDB" }} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">{t.name}</p>
                  <p className="text-xs text-fg-faint">Desain {t.key} · {t.accent || "default"}</p>
                </div>
                <Badge tone={scopeTone[t.scope] || "neutral"}>{t.scope === "org" ? "Institusi" : t.scope === "global" ? "Global" : "Bawaan"}</Badge>
                {t.scope === "org" && (
                  <Button size="sm" variant="ghost" className="text-danger-fg hover:bg-danger-subtle" icon={Trash2} onClick={() => remove(t)}>Hapus</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
