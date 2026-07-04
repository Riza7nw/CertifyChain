import AnimatedNumber from "./motion/AnimatedNumber";

// Metric / stat card (Phase 8). Label + angka besar (tabular) + delta/sublabel opsional.
// Fase C: nilai numerik dianimasikan sebagai counter.
export default function StatCard({ label, value, delta, deltaTone = "success", icon: Icon, children }) {
  const deltaCls = deltaTone === "danger" ? "text-danger-fg" : deltaTone === "muted" ? "text-fg-faint" : "text-success-fg";
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-fg-faint" strokeWidth={2} aria-hidden="true" />}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-medium tabular-nums text-fg">
          {typeof value === "number" ? <AnimatedNumber value={value} duration={0.8} /> : value}
        </span>
        {delta && <span className={`text-xs font-medium ${deltaCls}`}>{delta}</span>}
      </div>
      {children && <div className="mt-1 text-xs text-fg-faint">{children}</div>}
    </div>
  );
}
