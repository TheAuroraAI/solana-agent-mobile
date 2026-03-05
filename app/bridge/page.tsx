import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { BridgeView } from '@/components/BridgeView';

export const metadata = {
  title: 'Bridge — MONOLITH',
  description: 'Cross-chain asset bridging aggregator for Solana.',
};

export default function BridgePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading bridge...</div>}>
        <BridgeView />
      </Suspense>
    </AppShell>
  );
}
