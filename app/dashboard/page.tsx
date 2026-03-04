import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { DashboardView } from '@/components/DashboardView';
import { DashboardSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'Dashboard — Aurora Agent' };

export default function DashboardPage() {
  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardView />
      </Suspense>
    </AppShell>
  );
}
