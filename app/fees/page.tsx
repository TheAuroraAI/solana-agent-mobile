import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { FeesView } from '@/components/FeesView';

export const metadata = {
  title: 'Fee Optimizer — MONOLITH',
  description: 'Analyze your transaction fees, find savings, and optimize priority fees.',
};

export default function FeesPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading fee data...</div>}>
        <FeesView />
      </Suspense>
    </AppShell>
  );
}
