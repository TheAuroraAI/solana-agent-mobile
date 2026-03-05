import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { CopyView } from '@/components/CopyView';

export const metadata = {
  title: 'Copy Trading — MONOLITH',
  description: 'Copy top Solana traders automatically.',
};

export default function CopyPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading traders...</div>}>
        <CopyView />
      </Suspense>
    </AppShell>
  );
}
