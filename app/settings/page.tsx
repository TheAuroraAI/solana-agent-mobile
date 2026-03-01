import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { SettingsView } from '@/components/SettingsView';

export default function SettingsPage() {
  return (
    <AppShell>
      <Suspense>
        <SettingsView />
      </Suspense>
    </AppShell>
  );
}
