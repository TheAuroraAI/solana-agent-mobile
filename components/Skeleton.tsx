'use client';

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {/* Balance card */}
      <div className="bg-gray-800/50 rounded-2xl p-6 space-y-3">
        <div className="h-3 bg-gray-700 rounded w-24" />
        <div className="h-8 bg-gray-700 rounded w-40" />
        <div className="h-3 bg-gray-700 rounded w-32" />
      </div>
      {/* Price ticker */}
      <div className="h-8 bg-gray-800/50 rounded-xl" />
      {/* Token list */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-800/30 rounded-xl p-3">
            <div className="w-10 h-10 bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-20" />
              <div className="h-3 bg-gray-700 rounded w-28" />
            </div>
            <div className="h-4 bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 pt-16">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
          <div className={`bg-gray-800/50 rounded-2xl p-4 space-y-2 ${i % 2 === 0 ? 'w-3/4' : 'w-2/3'}`}>
            <div className="h-3 bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-700 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActionsSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 pt-16">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-800/50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-700 rounded-lg" />
            <div className="h-4 bg-gray-700 rounded w-48" />
          </div>
          <div className="h-3 bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-700 rounded w-3/4" />
          <div className="flex gap-2 pt-2">
            <div className="h-9 bg-gray-700 rounded-lg w-24" />
            <div className="h-9 bg-gray-700 rounded-lg w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GenericSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 pt-16">
      <div className="h-6 bg-gray-800/50 rounded w-40" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-800/30 rounded-xl p-4 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-700 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
