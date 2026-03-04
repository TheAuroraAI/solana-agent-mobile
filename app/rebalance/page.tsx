import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { RebalanceView } from '@/components/RebalanceView';

export const metadata = { title: 'Rebalance — Aurora Agent' };

export default function RebalancePage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="safe-top px-4 pt-6 pb-4 animate-pulse">
          <div className="h-7 w-40 bg-gray-800 rounded mb-3" />
          <div className="h-4 w-64 bg-gray-800/60 rounded" />
        </div>
      }>
        <RebalanceView />
      </Suspense>
    </AppShell>
  );
}
