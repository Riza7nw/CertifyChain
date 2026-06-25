import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

// Alert/callout token-based (Phase 8). Warna semantik adaptif tema.
const STYLES = {
  error: { box: "bg-danger-subtle text-danger-fg", Icon: XCircle },
  success: { box: "bg-success-subtle text-success-fg", Icon: CheckCircle2 },
  info: { box: "bg-info-subtle text-info-fg", Icon: Info },
  warning: { box: "bg-warning-subtle text-warning-fg", Icon: AlertTriangle },
};

export default function Alert({ type = "info", title, children, className = "" }) {
  const { box, Icon } = STYLES[type] || STYLES.info;
  return (
    <div className={`flex gap-3 rounded-xl px-4 py-3 text-sm ${box} ${className}`}>
      <Icon className="mt-0.5 h-[18px] w-[18px] flex-shrink-0" strokeWidth={2} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
    </div>
  );
}
