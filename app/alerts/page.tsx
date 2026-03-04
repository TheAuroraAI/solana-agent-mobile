import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { AlertsView } from '@/components/AlertsView';

export const metadata = {
  title: 'Alerts — MONOLITH',
  description: 'Price alerts, whale moves, volume spikes, and custom notifications.',
};

export default function AlertsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-gray-500">Loading alerts...</div>}>
        <AlertsView />
      </Suspense>
    </AppShell>
  );
}
