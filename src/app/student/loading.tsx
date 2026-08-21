export default function Loading() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-surface-container" />
          <div className="h-4 w-64 rounded bg-surface-container" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-surface-container" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-surface-container" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
