import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { ActionsView } from '@/components/ActionsView';

export default function ActionsPage() {
  return (
    <AppShell>
      <Suspense>
        <ActionsView />
      </Suspense>
    </AppShell>
  );
}
