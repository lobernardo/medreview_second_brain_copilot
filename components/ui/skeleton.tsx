export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white border rounded-xl p-5 space-y-3 animate-pulse" style={{ borderColor: '#E5E7EB' }}>
      <div className="h-4 rounded-md bg-gray-200" style={{ width: '65%' }} />
      <div className="h-3 rounded-md bg-gray-100" style={{ width: '35%' }} />
      {lines >= 3 && <div className="h-3 rounded-md bg-gray-100" style={{ width: '90%' }} />}
      {lines >= 4 && <div className="h-3 rounded-md bg-gray-100" style={{ width: '75%' }} />}
    </div>
  )
}

export function SkeletonGrid({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  const colClass = cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
  return (
    <div className={`grid gap-4 ${colClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border rounded-xl p-4 animate-pulse space-y-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <div className="h-4 rounded-md bg-gray-200" style={{ width: '50%' }} />
            <div className="h-3 rounded-full bg-gray-100" style={{ width: '10%' }} />
          </div>
          <div className="h-3 rounded-md bg-gray-100" style={{ width: '80%' }} />
          <div className="h-3 rounded-md bg-gray-100" style={{ width: '60%' }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonForm() {
  return (
    <div className="bg-white border rounded-xl p-6 space-y-5 animate-pulse max-w-xl" style={{ borderColor: '#E5E7EB' }}>
      <div className="h-4 rounded-md bg-gray-200" style={{ width: '40%' }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 rounded bg-gray-100" style={{ width: '25%' }} />
          <div className="h-9 rounded-lg bg-gray-100 w-full" />
        </div>
      ))}
    </div>
  )
}
