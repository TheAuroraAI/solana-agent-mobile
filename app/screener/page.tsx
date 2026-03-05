import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { ScreenerView } from '@/components/ScreenerView';

export const metadata = {
  title: 'Token Screener — MONOLITH',
  description: 'Advanced filter and sort Solana tokens by any metric.',
};

export default function ScreenerPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading screener...</div>}>
        <ScreenerView />
      </Suspense>
    </AppShell>
  );
}
