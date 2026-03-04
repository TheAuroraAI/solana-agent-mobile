import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { DAppStore } from '@/components/DAppStore';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'dApp Store — Aurora' };

export default function StorePage() {
  return (
    <AppShell>
      <Suspense fallback={<GenericSkeleton />}>
        <div className="px-4 pt-4 pb-24">
          <DAppStore />
        </div>
      </Suspense>
    </AppShell>
  );
}
