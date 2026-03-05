import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { AirdropsView } from '@/components/AirdropsView';

export const metadata = {
  title: 'Airdrop Tracker — MONOLITH',
  description: 'Upcoming and claimable Solana airdrops for your wallet.',
};

export default function AirdropsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading airdrops...</div>}>
        <AirdropsView />
      </Suspense>
    </AppShell>
  );
}
