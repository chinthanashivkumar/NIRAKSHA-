export default function SkeletonCard({ rows = 3, height = 'h-28', className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3 ${className}`}>
      <div className="skeleton-shimmer h-5 w-1/3 rounded" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-3 rounded"
            style={{ width: `${Math.max(40, 100 - i * 20)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
