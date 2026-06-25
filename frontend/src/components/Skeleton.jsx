// Skeleton placeholder (Phase 8). Pakai .skeleton (shimmer) dari index.css.
export default function Skeleton({ className = "h-4 w-full" }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

// Beberapa baris skeleton untuk daftar/tabel.
export function SkeletonRows({ rows = 4, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
