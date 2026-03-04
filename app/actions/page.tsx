import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { ActionsView } from '@/components/ActionsView';
import { ActionsSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'Actions — Aurora Agent' };

export default function ActionsPage() {
  return (
    <AppShell>
      <Suspense fallback={<ActionsSkeleton />}>
        <ActionsView />
      </Suspense>
    </AppShell>
  );
}
