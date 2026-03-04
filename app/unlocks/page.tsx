import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { UnlockCalendar } from '@/components/UnlockCalendar';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'Token Unlocks — Aurora' };

export default function UnlocksPage() {
  return (
    <AppShell>
      <Suspense fallback={<GenericSkeleton />}>
        <div className="safe-top px-4 pt-6 pb-4">
          <div className="mb-5">
            <h1 className="text-white text-xl font-bold">Token Unlocks</h1>
            <p className="text-gray-400 text-xs mt-1">
              Upcoming token unlock events and their potential market impact.
            </p>
          </div>
          <UnlockCalendar />
        </div>
      </Suspense>
    </AppShell>
  );
}
