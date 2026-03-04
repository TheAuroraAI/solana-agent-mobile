import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { WhalesView } from '@/components/WhalesView';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'Whale Alerts — Aurora' };

export default function WhalesPage() {
  return (
    <AppShell>
      <Suspense fallback={<GenericSkeleton />}>
        <WhalesView />
      </Suspense>
    </AppShell>
  );
}
