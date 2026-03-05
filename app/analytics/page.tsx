import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { AnalyticsView } from '@/components/AnalyticsView';

export const metadata = {
  title: 'Portfolio Analytics — MONOLITH',
  description: 'Performance metrics, P&L tracking, and trading insights.',
};

export default function AnalyticsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading analytics...</div>}>
        <AnalyticsView />
      </Suspense>
    </AppShell>
  );
}
