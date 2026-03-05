import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { ValidatorsView } from '@/components/ValidatorsView';

export const metadata = {
  title: 'Validators — MONOLITH',
  description: 'Compare Solana validators by APY, commission, uptime, and performance.',
};

export default function ValidatorsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading validators...</div>}>
        <ValidatorsView />
      </Suspense>
    </AppShell>
  );
}
