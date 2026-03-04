import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { DcaView } from '@/components/DcaView';

export const metadata = {
  title: 'DCA Scheduler — MONOLITH',
  description: 'Dollar-cost averaging into Solana tokens with automated scheduling.',
};

export default function DcaPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading DCA plans...</div>}>
        <DcaView />
      </Suspense>
    </AppShell>
  );
}
