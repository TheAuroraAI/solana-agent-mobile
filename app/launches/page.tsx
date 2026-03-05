import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { LaunchesView } from '@/components/LaunchesView';

export const metadata = {
  title: 'Token Launches — MONOLITH',
  description: 'Upcoming Solana token launches, IDOs, and fair launches.',
};

export default function LaunchesPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading launches...</div>}>
        <LaunchesView />
      </Suspense>
    </AppShell>
  );
}
