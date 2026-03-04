import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { SettingsView } from '@/components/SettingsView';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'Settings — Aurora Agent' };

export default function SettingsPage() {
  return (
    <AppShell>
      <Suspense fallback={<GenericSkeleton />}>
        <SettingsView />
      </Suspense>
    </AppShell>
  );
}
