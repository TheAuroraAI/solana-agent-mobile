import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { GovernanceView } from '@/components/GovernanceView';

export const metadata = {
  title: 'Governance — MONOLITH',
  description: 'Track and vote on Solana DAO governance proposals.',
};

export default function GovernancePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading proposals...</div>}>
        <GovernanceView />
      </Suspense>
    </AppShell>
  );
}
