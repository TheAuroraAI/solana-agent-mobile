import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { HistoryView } from '@/components/HistoryView';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'Transaction History — Aurora Agent' };

export default function HistoryPage() {
  return (
    <AppShell>
      <Suspense fallback={<GenericSkeleton />}>
        <HistoryView />
      </Suspense>
    </AppShell>
  );
}
