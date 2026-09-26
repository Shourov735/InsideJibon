export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-surface-2" />
          <div className="h-8 w-56 rounded-xl bg-surface-2" />
          <div className="h-4 w-80 rounded bg-surface-2" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-1" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-1" />
          ))}
        </div>
      </div>
    </div>
  );
}
