import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { PoliciesView } from '@/components/PoliciesView';

export const metadata = { title: 'Policies — Aurora' };

export default function PoliciesPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <PoliciesView />
      </Suspense>
    </AppShell>
  );
}
