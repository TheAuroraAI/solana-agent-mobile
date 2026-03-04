import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { GasView } from '@/components/GasView';

export const metadata = {
  title: 'Gas Station — MONOLITH',
  description: 'Real-time Solana priority fee monitor with congestion levels and fee history.',
};

export default function GasPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading gas data...</div>}>
        <GasView />
      </Suspense>
    </AppShell>
  );
}
