export function LoadingSkeleton() {
  return (
    <div className="flex-1 p-2 animate-pulse">
      <div className="hidden sm:grid sm:grid-cols-7 border-b border-[var(--cal-grid-border)]">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="py-2 text-center border-l border-[var(--cal-grid-border)] first:border-l-0">
            <div className="h-3 bg-gray-200 rounded w-10 mx-auto mb-1" />
            <div className="h-2 bg-gray-100 rounded w-8 mx-auto" />
          </div>
        ))}
      </div>
      <div className="hidden sm:grid sm:grid-cols-7 mt-0">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="p-1 space-y-1 border-l border-[var(--cal-grid-border)] first:border-l-0">
            <div className="h-14 bg-gray-100 rounded" />
            <div className="h-14 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="sm:hidden space-y-4 mt-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-16 bg-gray-100 rounded" />
            <div className="h-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
