import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { DefiView } from '@/components/DefiView';

export const metadata = {
  title: 'DeFi Rates — MONOLITH',
  description: 'Best lending/borrowing rates across Solana DeFi protocols.',
};

export default function DefiPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading DeFi rates...</div>}>
        <DefiView />
      </Suspense>
    </AppShell>
  );
}
