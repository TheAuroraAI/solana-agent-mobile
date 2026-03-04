import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { BlinksView } from '@/components/BlinksView';
import { GenericSkeleton } from '@/components/Skeleton';

export const metadata = {
  title: 'Solana Actions — Aurora Agent',
  description: 'Execute any Solana Action (Blink) directly in Aurora. Paste any solana-action: URL to swap, stake, donate, and more.',
};

export default function BlinksPage() {
  return (
    <AppShell>
      <Suspense fallback={<GenericSkeleton />}>
        <BlinksView />
      </Suspense>
    </AppShell>
  );
}
