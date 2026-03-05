import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { LimitsView } from '@/components/LimitsView';

export const metadata = {
  title: 'Limit Orders — MONOLITH',
  description: 'Place and manage limit orders for Solana tokens.',
};

export default function LimitsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading orders...</div>}>
        <LimitsView />
      </Suspense>
    </AppShell>
  );
}
