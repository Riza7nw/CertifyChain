import { CheckCircle2, Ban, Clock } from "lucide-react";
import Badge from "./Badge";

// Badge status sertifikat (Phase 8 / Fase 2) — konsisten lintas halaman.
export default function CertStatus({ status }) {
  if (status === "revoked") return <Badge tone="danger" icon={Ban}>Dicabut</Badge>;
  if (status === "pending") return <Badge tone="warning" icon={Clock}>Pending</Badge>;
  return <Badge tone="success" icon={CheckCircle2}>Aktif</Badge>;
}
