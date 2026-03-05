import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { TaxView } from '@/components/TaxView';

export const metadata = {
  title: 'Tax Report — MONOLITH',
  description: 'Crypto tax summary and export for your Solana transactions.',
};

export default function TaxPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading tax data...</div>}>
        <TaxView />
      </Suspense>
    </AppShell>
  );
}
