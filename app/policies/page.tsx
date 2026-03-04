import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { PoliciesView } from '@/components/PoliciesView';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = { title: 'Policies — Aurora' };

export default function PoliciesPage() {
  return (
    <AppShell>
      <Suspense fallback={<GenericSkeleton />}>
        <PoliciesView />
      </Suspense>
    </AppShell>
  );
}
