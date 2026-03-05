import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { MevView } from '@/components/MevView';

export const metadata = {
  title: 'MEV Shield — MONOLITH',
  description: 'Protect your Solana trades from MEV attacks and sandwich bots.',
};

export default function MevPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading MEV data...</div>}>
        <MevView />
      </Suspense>
    </AppShell>
  );
}
