// Input/Textarea/Select/File token-based (Phase 8) — label + helper + error state.

const inputCls =
  "w-full rounded-lg border bg-surface px-3.5 text-sm text-fg placeholder-fg-faint shadow-xs transition " +
  "focus:outline-none focus:ring-2 focus:ring-focusring focus:border-brand " +
  "disabled:bg-surface-hover disabled:text-fg-faint disabled:cursor-not-allowed";

function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg">
      {children}
      {required && <span className="ml-0.5 text-danger-fg">*</span>}
    </label>
  );
}

function Hint({ error, helper }) {
  if (error) return <p className="mt-1 text-xs text-danger-fg">{error}</p>;
  if (helper) return <p className="mt-1 text-xs text-fg-muted">{helper}</p>;
  return null;
}

export function TextField({ label, id, helper, error, required, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <input
        id={id}
        className={`${inputCls} h-10 py-2.5 ${error ? "border-danger" : "border-line-strong"}`}
        {...props}
      />
      <Hint error={error} helper={helper} />
    </div>
  );
}

export function TextAreaField({ label, id, helper, error, required, rows = 4, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <textarea
        id={id}
        rows={rows}
        className={`${inputCls} resize-y py-2.5 ${error ? "border-danger" : "border-line-strong"}`}
        {...props}
      />
      <Hint error={error} helper={helper} />
    </div>
  );
}

export function SelectField({ label, id, helper, error, required, className = "", children, ...props }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <select
        id={id}
        className={`${inputCls} h-10 py-2.5 ${error ? "border-danger" : "border-line-strong"}`}
        {...props}
      >
        {children}
      </select>
      <Hint error={error} helper={helper} />
    </div>
  );
}

export function FileField({ label, id, helper, error, fileName, required, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <input
        id={id}
        type="file"
        className="w-full cursor-pointer rounded-lg border border-line-strong bg-surface text-sm text-fg-muted shadow-xs transition file:mr-3 file:cursor-pointer file:border-0 file:bg-brand-subtle file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-subtle-fg hover:file:bg-brand-subtle focus:outline-none focus:ring-2 focus:ring-focusring"
        {...props}
      />
      {fileName && <p className="mt-1 truncate text-xs text-fg-muted">Dipilih: {fileName}</p>}
      <Hint error={error} helper={helper} />
    </div>
  );
}
