import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { DashboardView } from '@/components/DashboardView';

export default function DashboardPage() {
  return (
    <AppShell>
      <Suspense>
        <DashboardView />
      </Suspense>
    </AppShell>
  );
}
