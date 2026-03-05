import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { InspectView } from '@/components/InspectView';

export const metadata = {
  title: 'Wallet Inspector — MONOLITH',
  description: 'Deep-dive analytics on any Solana wallet address.',
};

export default function InspectPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading inspector...</div>}>
        <InspectView />
      </Suspense>
    </AppShell>
  );
}
