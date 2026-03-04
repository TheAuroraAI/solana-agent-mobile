import { Suspense } from 'react';
import { HistoryView } from '@/components/HistoryView';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'Transaction History — Aurora Agent' };

export default function HistoryPage() {
  return (
    <Suspense fallback={<GenericSkeleton />}>
      <HistoryView />
    </Suspense>
  );
}
