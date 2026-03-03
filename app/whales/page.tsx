import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { WhalesView } from '@/components/WhalesView';

export const metadata = { title: 'Whale Alerts — Aurora' };

export default function WhalesPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <WhalesView />
      </Suspense>
    </AppShell>
  );
}
