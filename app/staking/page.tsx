import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { StakingView } from '@/components/StakingView';

export const metadata = {
  title: 'Staking — MONOLITH',
  description: 'Stake SOL with Jito, Marinade, or native validators. Track positions, APY, and rewards.',
};

export default function StakingPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading staking...</div>}>
        <StakingView />
      </Suspense>
    </AppShell>
  );
}
