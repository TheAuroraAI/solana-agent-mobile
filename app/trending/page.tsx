import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { TrendingView } from '@/components/TrendingView';

export const metadata = { title: 'Trending — Aurora Agent' };

function TrendingSkeleton() {
  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 pt-4 pb-3">
        <div className="h-7 bg-gray-800 rounded animate-pulse w-28 mb-4" />
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-gray-800 rounded animate-pulse w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-800/50">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-5 h-3 bg-gray-800 rounded animate-pulse" />
            <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-800 rounded animate-pulse w-20" />
              <div className="h-2.5 bg-gray-800 rounded animate-pulse w-28" />
            </div>
            <div className="text-right space-y-1.5">
              <div className="h-3.5 bg-gray-800 rounded animate-pulse w-16" />
              <div className="h-2.5 bg-gray-800 rounded animate-pulse w-12 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrendingPage() {
  return (
    <AppShell>
      <Suspense fallback={<TrendingSkeleton />}>
        <TrendingView />
      </Suspense>
    </AppShell>
  );
}
